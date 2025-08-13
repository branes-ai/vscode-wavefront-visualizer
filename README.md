# Wavefront Visualizer - VS Code Extension

A VS Code extension for visualizing 3D index spaces and concurrent activity wavefronts in AI operator schedules using WebGL/Three.js.

## Features

- **3D Visualization**: Real-time 3D rendering of index space activity using Three.js
- **Multiple Render Modes**: Points, cubes, and spheres for different visualization preferences
- **AI Operator Support**: Specialized support for Conv2D, Linear, MatMul, and other operators
- **Animation Controls**: Play, pause, and scrub through wavefront progression
- **Modern C++ Integration**: Easy integration with existing C++20 codebases
- **Real-time Capture**: Capture actual execution patterns from running code

## Installation

### Extension Setup

1. **Build the Extension**:
   ```bash
   npm install
   npm run compile
   ```

2. **Install in VS Code**:
   ```bash
   code --install-extension ./wavefront-visualizer-0.1.0.vsix
   ```

### C++ Library Setup

1. **Dependencies**:
   ```bash
   # Install nlohmann/json for JSON serialization
   # Ubuntu/Debian:
   sudo apt-get install nlohmann-json3-dev
   
   # macOS with Homebrew:
   brew install nlohmann-json
   
   # Or use vcpkg:
   vcpkg install nlohmann-json
   ```

2. **Compiler Requirements**:
   - GCC 10+ or Clang 13+ (for C++20 support)
   - CMake 3.16+ (recommended)

3. **CMake Integration**:
   ```cmake
   find_package(nlohmann_json 3.2.0 REQUIRED)
   target_link_libraries(your_target nlohmann_json::nlohmann_json)
   target_compile_features(your_target PRIVATE cxx_std_20)
   ```

## Usage

### Quick Start

1. **Generate Sample Data**:
   ```cpp
   #include "wavefront_visualizer.hpp"
   using namespace wavefront;
   
   // Generate a Conv2D schedule
   auto schedule = schedules::create_conv2d_schedule(
       {1, 64, 64, 32},  // Input shape
       {3, 3},           // Kernel size
       50,               // Number of frames
       "radial"          // Pattern type
   );
   
   schedule.save_to_file("conv2d_schedule.json");
   ```

2. **Open in VS Code**:
   - Right-click on the generated `.json` file
   - Select "Load Schedule File"
   - The 3D visualization will open automatically

### Visualization Controls

- **Mouse**: Orbit around the 3D scene
- **Mouse Wheel**: Zoom in/out
- **Time Slider**: Scrub through animation frames
- **Play/Pause**: Control animation playback
- **Speed Control**: Adjust animation speed (0.1x to 3.0x)
- **Render Mode**: Switch between points, cubes, and spheres

### Advanced Usage

#### Custom Schedule Creation

```cpp
// Create custom index space
IndexSpace space({128, 128, 64});  // 3D tensor

// Define operator information
OperatorInfo op_info{
    .type = "CustomOp",
    .input_shape = {128, 128, 64},
    .output_shape = {126, 126, 64},
    .parameters = nlohmann::json{{"custom_param", 42}}
};

// Create schedule and add custom frames
Schedule schedule(std::move(space), std::move(op_info));

// Add frames manually or use built-in patterns
schedule.generate_wavefront_pattern(60, "tiled");
schedule.save_to_file("custom_schedule.json");
```

#### Real-time Execution Capture

```cpp
// In your existing AI operator implementation
void your_convolution_function() {
    // Setup capture
    auto index_space = IndexSpace({1, 224, 224, 3});
    auto op_info = OperatorInfo::conv2d({1, 224, 224, 3}, {3, 3});
    
    WAVEFRONT_CAPTURE_SCOPE(index_space, op_info, "real_execution.json");
    
    // Your existing computation loops
    for (int oh = 0; oh < output_height; ++oh) {
        for (int ow = 0; ow < output_width; ++ow) {
            std::vector<IndexSpace::Index> active_indices;
            
            // Record which indices are currently being processed
            for (int kh = 0; kh < kernel_height; ++kh) {
                for (int kw = 0; kw < kernel_width; ++kw) {
                    int ih = oh + kh;
                    int iw = ow + kw;
                    for (int c = 0; c < channels; ++c) {
                        active_indices.push_back({0, ih, iw, c});
                    }
                }
            }
            
            WAVEFRONT_RECORD(active_indices);
            
            // Your actual computation
            compute_output_at(oh, ow);
        }
    }
    // Schedule automatically saved when scope exits
}
```

## Architecture Overview

### Extension Structure

```
wavefront-visualizer/
├── package.json              # Extension manifest
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── WavefrontPanel.ts     # Webview panel management
├── media/
│   └── main.js              # Three.js visualization code
└── out/                     # Compiled TypeScript output
```

### Data Flow

1. **C++ Code** → Generates schedule JSON files
2. **VS Code Extension** → Loads and parses JSON data
3. **WebView** → Receives data via message passing
4. **Three.js** → Renders 3D visualization with WebGL

### WebView Communication

The extension uses VS Code's webview API for secure communication:

```typescript
// Extension to WebView
panel.webview.postMessage({
    command: 'loadSchedule',
    data: scheduleData
});

// WebView to Extension
vscode.postMessage({
    command: 'requestData',
    params: {...}
});
```

## Supported Operators

### Conv2D
- **Patterns**: Radial, linear, tiled
- **Visualizes**: Input tensor access patterns
- **Metadata**: Kernel size, stride, padding

### Linear/Dense Layers
- **Patterns**: Linear, blocked
- **Visualizes**: Matrix-vector multiplication patterns
- **Metadata**: Input/output dimensions

### MatMul
- **Patterns**: Blocked, diagonal
- **Visualizes**: Matrix multiplication tile execution
- **Metadata**: Block size, algorithm

### Custom Operators
- **Flexible**: Define your own patterns
- **Extensible**: Add custom metadata
- **Configurable**: Control visualization parameters

## Performance Considerations

### C++ Library
- **Zero Runtime Overhead**: Capture code can be disabled with preprocessor flags
- **Minimal Memory**: Efficient storage of index sequences
- **Modern C++**: Uses concepts, ranges, and structured bindings for clarity

### Visualization
- **WebGL Acceleration**: Hardware-accelerated 3D rendering
- **Level of Detail**: Automatic culling for large datasets
- **Efficient Updates**: Only renders active frames

### Memory Usage
- **Large Datasets**: Consider subsampling for >10M indices
- **Frame Limits**: Default limit of 1000 frames (configurable)
- **Compression**: JSON compression for large schedules

## Customization

### Render Modes

Extend the visualization by adding new render modes:

```javascript
// In webview main.js
function createCustomVisualization(frameData) {
    // Your custom Three.js rendering code
    const geometry = new THREE.BufferGeometry();
    // ... custom geometry creation
    
    const material = new THREE.ShaderMaterial({
        // Custom shaders for specialized effects
    });
}
```

### Color Schemes

Customize colors based on operator metadata:

```javascript
function getColorForIndex(index, metadata) {
    // Color based on distance from center
    const distance = Math.sqrt(
        Math.pow(index[0] - center[0], 2) + 
        Math.pow(index[1] - center[1], 2) + 
        Math.pow(index[2] - center[2], 2)
    );
    
    return new THREE.Color().setHSL(
        distance / maxDistance,  // Hue
        0.8,                     // Saturation
        0.6                      // Lightness
    );
}
```

## Troubleshooting

### Common Issues

1. **WebGL Not Supported**:
   - Enable hardware acceleration in VS Code settings
   - Check browser compatibility with `chrome://gpu/`

2. **Large File Loading Slow**:
   - Reduce number of frames or subsample indices
   - Use compression for JSON files

3. **Animation Stuttering**:
   - Reduce animation speed
   - Switch to simpler render mode (points vs cubes)
   - Check GPU memory usage

### Debugging

Enable debug output in the extension:

```typescript
// In extension.ts
const config = vscode.workspace.getConfiguration('wavefrontVisualizer');
const debugMode = config.get<boolean>('enableDebugOutput', false);
```

### Performance Profiling

Monitor performance in the browser dev tools:
1. Open VS Code Developer Tools (`Help > Toggle Developer Tools`)
2. Navigate to the Performance tab
3. Record while animating
4. Analyze WebGL calls and memory usage

## Contributing

### Development Setup

1. **Clone and Install**:
   ```bash
   git clone <repository>
   cd wavefront-visualizer
   npm install
   ```

2. **Development Build**:
   ```bash
   npm run watch
   ```

3. **Testing**:
   ```bash
   # Open in VS Code development host
   code --extensionDevelopmentPath=. .
   ```

### Adding New Features

1. **New Operator Types**: Extend `OperatorInfo` class
2. **Visualization Modes**: Add to webview JavaScript
3. **Analysis Tools**: Extend panel with new controls

### C++ Library Extensions

The library is designed for extensibility:

```cpp
// Add new wavefront patterns
class CustomPattern : public WavefrontPattern {
public:
    void generate_frames(Schedule& schedule, size_t num_frames) override {
        // Your custom pattern implementation
    }
};
```

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- **Three.js** for 3D rendering capabilities
- **VS Code Extension API** for seamless IDE integration
- **nlohmann/json** for efficient C++ JSON handling