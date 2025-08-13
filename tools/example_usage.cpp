#include "wavefront_visualizer.hpp"
#include <iostream>
#include <filesystem>

// Example: Generating schedules for different AI operators
int main() {
    using namespace wavefront;
    
    // Create output directory for VS Code extension
    std::filesystem::create_directories("./schedules");
    
    // Example 1: Conv2D operator with radial wavefront pattern
    {
        std::cout << "Generating Conv2D schedule...\n";
        
        auto conv_schedule = schedules::create_conv2d_schedule(
            {1, 64, 64, 32},  // Input: batch=1, height=64, width=64, channels=32
            {3, 3},           // Kernel: 3x3
            60,               // 60 frames
            "radial"          // Radial wavefront pattern
        );
        
        conv_schedule.save_to_file("./schedules/conv2d_radial.json");
        std::cout << "Saved: ./schedules/conv2d_radial.json\n";
    }
    
    // Example 2: Conv2D with tiled execution pattern
    {
        std::cout << "Generating Conv2D tiled schedule...\n";
        
        auto tiled_schedule = schedules::create_conv2d_schedule(
            {1, 128, 128, 64}, // Larger input
            {5, 5},            // Larger kernel
            80,                // More frames for complexity
            "tiled"            // Tiled execution pattern
        );
        
        tiled_schedule.save_to_file("./schedules/conv2d_tiled.json");
        std::cout << "Saved: ./schedules/conv2d_tiled.json\n";
    }
    
    // Example 3: Linear layer with linear wavefront
    {
        std::cout << "Generating Linear layer schedule...\n";
        
        auto linear_schedule = schedules::create_linear_schedule(
            2048,     // Input features
            1024,     // Output features  
            40,       // Frames
            "linear"  // Linear progression
        );
        
        linear_schedule.save_to_file("./schedules/linear_layer.json");
        std::cout << "Saved: ./schedules/linear_layer.json\n";
    }
    
    // Example 4: Custom schedule with manual frame creation
    {
        std::cout << "Generating custom MatMul schedule...\n";
        
        IndexSpace matmul_space({512, 512, 256}); // M x N x K dimensions
        OperatorInfo matmul_info{
            .type = "MatMul",
            .input_shape = {512, 256, 512, 256}, // A: MxK, B: KxN
            .output_shape = {512, 512},           // C: MxN
            .parameters = nlohmann::json{
                {"algorithm", "blocked"},
                {"blockSize", 64}
            }
        };
        
        Schedule matmul_schedule(std::move(matmul_space), std::move(matmul_info));
        
        // Custom blocked matrix multiplication pattern
        constexpr std::size_t block_size = 64;
        constexpr std::size_t M = 512, N = 512, K = 256;
        
        for (std::size_t frame = 0; frame < 50; ++frame) {
            auto timestamp = std::chrono::high_resolution_clock::now();
            std::vector<IndexSpace::Index> active_indices;
            
            // Simulate blocked execution - different blocks active over time
            std::size_t blocks_m = M / block_size;
            std::size_t blocks_n = N / block_size;
            std::size_t blocks_k = K / block_size;
            
            // Diagonal wave through blocks
            for (std::size_t bm = 0; bm < blocks_m; ++bm) {
                for (std::size_t bn = 0; bn < blocks_n; ++bn) {
                    // Only activate blocks on the current "diagonal wave"
                    if ((bm + bn + frame / 5) % (blocks_m + blocks_n) < 3) {
                        for (std::size_t bk = 0; bk < blocks_k; ++bk) {
                            // Add some indices from this block
                            for (std::size_t i = 0; i < block_size; i += 8) {
                                for (std::size_t j = 0; j < block_size; j += 8) {
                                    for (std::size_t k = 0; k < block_size; k += 8) {
                                        std::size_t m = bm * block_size + i;
                                        std::size_t n = bn * block_size + j;
                                        std::size_t kk = bk * block_size + k;
                                        
                                        if (m < M && n < N && kk < K) {
                                            active_indices.push_back({m, n, kk});
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            matmul_schedule.add_frame(WavefrontFrame{
                .timestamp = timestamp,
                .active_indices = std::move(active_indices),
                .operator_type = "MatMul",
                .metadata = nlohmann::json{
                    {"frame", frame},
                    {"pattern", "blocked_diagonal"},
                    {"blockSize", block_size}
                }
            });
        }
        
        matmul_schedule.save_to_file("./schedules/matmul_blocked.json");
        std::cout << "Saved: ./schedules/matmul_blocked.json\n";
    }
    
    std::cout << "\nAll schedules generated! You can now:\n";
    std::cout << "1. Open VS Code in a workspace containing these files\n";
    std::cout << "2. Install the Wavefront Visualizer extension\n";
    std::cout << "3. Right-click on any .json file and select 'Load Schedule File'\n";
    std::cout << "4. Explore the 3D wavefront visualizations!\n";
    
    return 0;
}

// Additional utility: Real-time schedule capture from actual execution
namespace wavefront::capture {

class ScheduleCapture {
public:
    explicit ScheduleCapture(IndexSpace space, OperatorInfo info)
        : schedule_(std::move(space), std::move(info)) {}
    
    // Start capturing execution
    void start_capture() {
        capture_start_ = std::chrono::high_resolution_clock::now();
        is_capturing_ = true;
    }
    
    // Record active indices at current time
    void record_frame(std::vector<IndexSpace::Index> active_indices) {
        if (!is_capturing_) return;
        
        auto now = std::chrono::high_resolution_clock::now();
        schedule_.add_frame(WavefrontFrame{
            .timestamp = now,
            .active_indices = std::move(active_indices),
            .operator_type = schedule_.operator_info_.type,
            .metadata = nlohmann::json{
                {"captureTime", std::chrono::duration_cast<std::chrono::microseconds>(
                    now - capture_start_).count()}
            }
        });
    }
    
    // Stop capturing and save
    void stop_capture(const std::string& filename) {
        is_capturing_ = false;
        schedule_.save_to_file(filename);
    }
    
    // RAII helper for automatic capture scope
    class ScopedCapture {
    public:
        ScopedCapture(ScheduleCapture& capture, const std::string& filename)
            : capture_(capture), filename_(filename) {
            capture_.start_capture();
        }
        
        ~ScopedCapture() {
            capture_.stop_capture(filename_);
        }
        
        void record(std::vector<IndexSpace::Index> indices) {
            capture_.record_frame(std::move(indices));
        }
        
    private:
        ScheduleCapture& capture_;
        std::string filename_;
    };

private:
    Schedule schedule_;
    std::chrono::high_resolution_clock::time_point capture_start_;
    bool is_capturing_ = false;
};

// Macro for easy integration into existing C++ AI operator code
#define WAVEFRONT_CAPTURE_SCOPE(space, info, filename) \
    auto _wf_capture = wavefront::capture::ScheduleCapture(space, info); \
    auto _wf_scope = wavefront::capture::ScheduleCapture::ScopedCapture(_wf_capture, filename);

#define WAVEFRONT_RECORD(indices) \
    _wf_scope.record(indices);

// Example integration with existing operator code:
void example_conv2d_with_capture() {
    // Your existing Conv2D setup
    std::vector<std::size_t> input_shape = {1, 224, 224, 3};
    std::vector<std::size_t> kernel_size = {3, 3};
    
    // Set up wavefront capture
    auto index_space = IndexSpace(input_shape);
    auto op_info = OperatorInfo::conv2d(input_shape, kernel_size);
    
    WAVEFRONT_CAPTURE_SCOPE(index_space, op_info, "real_conv2d_execution.json");
    
    // Your existing nested loops for Conv2D computation
    for (std::size_t oh = 0; oh < 222; ++oh) {
        for (std::size_t ow = 0; ow < 222; ++ow) {
            std::vector<IndexSpace::Index> current_active;
            
            // Record which input indices are being accessed
            for (std::size_t kh = 0; kh < 3; ++kh) {
                for (std::size_t kw = 0; kw < 3; ++kw) {
                    std::size_t ih = oh + kh;
                    std::size_t iw = ow + kw;
                    for (std::size_t c = 0; c < 3; ++c) {
                        current_active.push_back({0, ih, iw, c});
                    }
                }
            }
            
            WAVEFRONT_RECORD(current_active);
            
            // Your actual computation here...
            // compute_convolution_at(oh, ow);
        }
    }
    
    // Capture automatically saved when scope exits
}