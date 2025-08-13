#pragma once

#include <vector>
#include <string>
#include <memory>
#include <chrono>
#include <nlohmann/json.hpp>

namespace wavefront {

// Modern C++ using concepts for type constraints (C++20)
template<typename T>
concept Numeric = std::is_arithmetic_v<T>;

// Index space representation with modern C++ features
class IndexSpace {
public:
    using Dimension = std::size_t;
    using Index = std::vector<Dimension>;
    
    IndexSpace(std::vector<Dimension> dims, std::vector<Dimension> strides = {})
        : dimensions_(std::move(dims)), strides_(std::move(strides)) {
        if (strides_.empty()) {
            compute_default_strides();
        }
    }
    
    // Range-based access with structured bindings support
    auto get_dimensions() const noexcept -> const std::vector<Dimension>& { 
        return dimensions_; 
    }
    
    auto get_strides() const noexcept -> const std::vector<Dimension>& { 
        return strides_; 
    }
    
    // Convert multi-dimensional index to linear offset
    template<Numeric... Indices>
    [[nodiscard]] auto linear_offset(Indices... indices) const -> std::size_t {
        static_assert(sizeof...(indices) > 0, "At least one index required");
        std::array<std::size_t, sizeof...(indices)> idx_array{
            static_cast<std::size_t>(indices)...
        };
        
        std::size_t offset = 0;
        for (std::size_t i = 0; i < std::min(idx_array.size(), strides_.size()); ++i) {
            offset += idx_array[i] * strides_[i];
        }
        return offset;
    }
    
    // Check if index is within bounds
    [[nodiscard]] auto is_valid_index(const Index& idx) const noexcept -> bool {
        if (idx.size() != dimensions_.size()) return false;
        
        return std::ranges::equal(idx, dimensions_, 
            [](auto i, auto dim) { return i < dim; });
    }

private:
    std::vector<Dimension> dimensions_;
    std::vector<Dimension> strides_;
    
    void compute_default_strides() {
        strides_.resize(dimensions_.size());
        if (!dimensions_.empty()) {
            strides_.back() = 1;
            for (int i = static_cast<int>(dimensions_.size()) - 2; i >= 0; --i) {
                strides_[i] = strides_[i + 1] * dimensions_[i + 1];
            }
        }
    }
};

// Wavefront data with time information
struct WavefrontFrame {
    using TimePoint = std::chrono::high_resolution_clock::time_point;
    using Duration = std::chrono::nanoseconds;
    
    TimePoint timestamp;
    std::vector<IndexSpace::Index> active_indices;
    std::string operator_type;
    nlohmann::json metadata;
    
    // Convert to JSON for VS Code extension
    [[nodiscard]] auto to_json() const -> nlohmann::json {
        return nlohmann::json{
            {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                timestamp.time_since_epoch()).count()},
            {"activeIndices", active_indices},
            {"operatorType", operator_type},
            {"metadata", metadata}
        };
    }
};

// Operator information for different AI operations
struct OperatorInfo {
    std::string type;
    std::vector<std::size_t> input_shape;
    std::vector<std::size_t> output_shape;
    nlohmann::json parameters;
    
    // Factory methods for common operators
    static auto conv2d(
        std::vector<std::size_t> input_shape,
        std::vector<std::size_t> kernel_size,
        std::vector<std::size_t> stride = {1, 1},
        std::string padding = "valid"
    ) -> OperatorInfo {
        auto output_shape = compute_conv2d_output_shape(
            input_shape, kernel_size, stride, padding);
        
        return OperatorInfo{
            .type = "Conv2D",
            .input_shape = std::move(input_shape),
            .output_shape = std::move(output_shape),
            .parameters = nlohmann::json{
                {"kernelSize", kernel_size},
                {"stride", stride},
                {"padding", padding}
            }
        };
    }
    
    static auto linear(std::size_t input_features, std::size_t output_features) -> OperatorInfo {
        return OperatorInfo{
            .type = "Linear",
            .input_shape = {input_features},
            .output_shape = {output_features},
            .parameters = nlohmann::json{
                {"inputFeatures", input_features},
                {"outputFeatures", output_features}
            }
        };
    }

private:
    static auto compute_conv2d_output_shape(
        const std::vector<std::size_t>& input_shape,
        const std::vector<std::size_t>& kernel_size,
        const std::vector<std::size_t>& stride,
        const std::string& padding
    ) -> std::vector<std::size_t> {
        // Simplified computation - assumes NHWC format
        if (input_shape.size() != 4 || kernel_size.size() != 2) {
            throw std::invalid_argument("Invalid shapes for Conv2D");
        }
        
        auto [n, h, w, c] = std::make_tuple(
            input_shape[0], input_shape[1], input_shape[2], input_shape[3]);
        auto [kh, kw] = std::make_tuple(kernel_size[0], kernel_size[1]);
        auto [sh, sw] = stride.size() >= 2 ? 
            std::make_tuple(stride[0], stride[1]) : std::make_tuple(1UL, 1UL);
        
        std::size_t out_h, out_w;
        if (padding == "valid") {
            out_h = (h - kh) / sh + 1;
            out_w = (w - kw) / sw + 1;
        } else { // "same"
            out_h = (h + sh - 1) / sh;
            out_w = (w + sw - 1) / sw;
        }
        
        return {n, out_h, out_w, c}; // Assuming same number of output channels
    }
};

// Complete schedule representation
class Schedule {
public:
    Schedule(IndexSpace index_space, OperatorInfo op_info)
        : index_space_(std::move(index_space)), operator_info_(std::move(op_info)) {}
    
    // Add wavefront frame
    void add_frame(WavefrontFrame frame) {
        frames_.emplace_back(std::move(frame));
    }
    
    // Generate frames for common patterns
    void generate_wavefront_pattern(std::size_t num_frames, const std::string& pattern = "radial") {
        if (pattern == "radial") {
            generate_radial_wavefront(num_frames);
        } else if (pattern == "linear") {
            generate_linear_wavefront(num_frames);
        } else if (pattern == "tiled") {
            generate_tiled_wavefront(num_frames);
        }
    }
    
    // Export to JSON for VS Code extension
    [[nodiscard]] auto to_json() const -> nlohmann::json {
        nlohmann::json frames_json = nlohmann::json::array();
        for (const auto& frame : frames_) {
            frames_json.push_back(frame.to_json());
        }
        
        return nlohmann::json{
            {"indexSpace", {
                {"dimensions", index_space_.get_dimensions()},
                {"strides", index_space_.get_strides()},
                {"origin", std::vector<std::size_t>(index_space_.get_dimensions().size(), 0)}
            }},
            {"wavefronts", frames_json},
            {"operatorInfo", {
                {"type", operator_info_.type},
                {"inputShape", operator_info_.input_shape},
                {"outputShape", operator_info_.output_shape},
                {"parameters", operator_info_.parameters}
            }}
        };
    }
    
    // Save to file for VS Code extension
    void save_to_file(const std::string& filename) const {
        std::ofstream file(filename);
        file << to_json().dump(2);
    }

private:
    IndexSpace index_space_;
    OperatorInfo operator_info_;
    std::vector<WavefrontFrame> frames_;
    
    void generate_radial_wavefront(std::size_t num_frames) {
        const auto& dims = index_space_.get_dimensions();
        if (dims.size() != 3) return; // Expecting 3D for this example
        
        auto [x_max, y_max, z_max] = std::make_tuple(dims[0], dims[1], dims[2]);
        auto center = std::make_tuple(x_max / 2, y_max / 2, z_max / 2);
        
        for (std::size_t frame = 0; frame < num_frames; ++frame) {
            auto timestamp = std::chrono::high_resolution_clock::now();
            std::vector<IndexSpace::Index> active_indices;
            
            double radius = static_cast<double>(frame) * 0.8;
            double thickness = 2.0;
            
            for (std::size_t x = 0; x < x_max; ++x) {
                for (std::size_t y = 0; y < y_max; ++y) {
                    for (std::size_t z = 0; z < z_max; ++z) {
                        double distance = std::sqrt(
                            std::pow(static_cast<double>(x) - std::get<0>(center), 2) +
                            std::pow(static_cast<double>(y) - std::get<1>(center), 2) +
                            std::pow(static_cast<double>(z) - std::get<2>(center), 2) * 0.25
                        );
                        
                        if (distance <= radius && distance > radius - thickness) {
                            active_indices.push_back({x, y, z});
                        }
                    }
                }
            }
            
            frames_.emplace_back(WavefrontFrame{
                .timestamp = timestamp,
                .active_indices = std::move(active_indices),
                .operator_type = operator_info_.type,
                .metadata = nlohmann::json{
                    {"wavefrontRadius", radius},
                    {"pattern", "radial"}
                }
            });
        }
    }
    
    void generate_linear_wavefront(std::size_t num_frames) {
        const auto& dims = index_space_.get_dimensions();
        if (dims.size() != 3) return;
        
        auto [x_max, y_max, z_max] = std::make_tuple(dims[0], dims[1], dims[2]);
        
        for (std::size_t frame = 0; frame < num_frames; ++frame) {
            auto timestamp = std::chrono::high_resolution_clock::now();
            std::vector<IndexSpace::Index> active_indices;
            
            std::size_t wave_front = (frame * x_max) / num_frames;
            std::size_t thickness = 3;
            
            for (std::size_t x = 0; x < x_max; ++x) {
                if (x >= wave_front && x < wave_front + thickness) {
                    for (std::size_t y = 0; y < y_max; ++y) {
                        for (std::size_t z = 0; z < z_max; ++z) {
                            active_indices.push_back({x, y, z});
                        }
                    }
                }
            }
            
            frames_.emplace_back(WavefrontFrame{
                .timestamp = timestamp,
                .active_indices = std::move(active_indices),
                .operator_type = operator_info_.type,
                .metadata = nlohmann::json{
                    {"wavefrontPosition", wave_front},
                    {"pattern", "linear"}
                }
            });
        }
    }
    
    void generate_tiled_wavefront(std::size_t num_frames) {
        const auto& dims = index_space_.get_dimensions();
        if (dims.size() != 3) return;
        
        auto [x_max, y_max, z_max] = std::make_tuple(dims[0], dims[1], dims[2]);
        constexpr std::size_t tile_size = 8;
        
        for (std::size_t frame = 0; frame < num_frames; ++frame) {
            auto timestamp = std::chrono::high_resolution_clock::now();
            std::vector<IndexSpace::Index> active_indices;
            
            // Calculate which tiles are active based on frame
            std::size_t tiles_per_dim_x = (x_max + tile_size - 1) / tile_size;
            std::size_t tiles_per_dim_y = (y_max + tile_size - 1) / tile_size;
            std::size_t total_tiles = tiles_per_dim_x * tiles_per_dim_y;
            
            std::size_t tiles_active = (frame * total_tiles) / num_frames;
            
            for (std::size_t tile_idx = 0; tile_idx < tiles_active; ++tile_idx) {
                std::size_t tile_x = tile_idx % tiles_per_dim_x;
                std::size_t tile_y = tile_idx / tiles_per_dim_x;
                
                for (std::size_t dx = 0; dx < tile_size; ++dx) {
                    for (std::size_t dy = 0; dy < tile_size; ++dy) {
                        std::size_t x = tile_x * tile_size + dx;
                        std::size_t y = tile_y * tile_size + dy;
                        
                        if (x < x_max && y < y_max) {
                            for (std::size_t z = 0; z < z_max; ++z) {
                                active_indices.push_back({x, y, z});
                            }
                        }
                    }
                }
            }
            
            frames_.emplace_back(WavefrontFrame{
                .timestamp = timestamp,
                .active_indices = std::move(active_indices),
                .operator_type = operator_info_.type,
                .metadata = nlohmann::json{
                    {"tilesActive", tiles_active},
                    {"tileSize", tile_size},
                    {"pattern", "tiled"}
                }
            });
        }
    }
};

// Utility functions for creating schedules
namespace schedules {

[[nodiscard]] auto create_conv2d_schedule(
    std::vector<std::size_t> input_shape,
    std::vector<std::size_t> kernel_size,
    std::size_t num_frames = 50,
    const std::string& pattern = "radial"
) -> Schedule {
    auto op_info = OperatorInfo::conv2d(input_shape, kernel_size);
    auto index_space = IndexSpace(input_shape);
    
    Schedule schedule(std::move(index_space), std::move(op_info));
    schedule.generate_wavefront_pattern(num_frames, pattern);
    
    return schedule;
}

[[nodiscard]] auto create_linear_schedule(
    std::size_t input_features,
    std::size_t output_features,
    std::size_t num_frames = 50,
    const std::string& pattern = "linear"
) -> Schedule {
    auto op_info = OperatorInfo::linear(input_features, output_features);
    auto index_space = IndexSpace({input_features, output_features, 1});
    
    Schedule schedule(std::move(index_space), std::move(op_info));
    schedule.generate_wavefront_pattern(num_frames, pattern);
    
    return schedule;
}

} // namespace schedules

} // namespace wavefront