# FIBO Parameter Sweep for ComfyUI

Custom ComfyUI nodes for generating multi-dimensional parameter sweeps with FIBO.

## Features

- **Parameter Sweep Generation**: Configure up to 3 parameters with multiple values
- **JSON Extraction**: Extract individual variants for batch processing
- **Grid Layout**: Automatic grid organization for visualization
- **Delta Tracking**: Track which parameters changed from base configuration

## Installation

### Method 1: Manual Installation

1. Clone or copy this directory to your ComfyUI custom nodes folder:
   ```bash
   cd ComfyUI/custom_nodes/
   git clone https://github.com/your-repo/fibo-control-net-visualizer
   # Or manually copy the packages/comfyui-fibo-sweep folder
   cp -r /path/to/fibo-control-net-visualizer/packages/comfyui-fibo-sweep .
   ```

2. Restart ComfyUI

### Method 2: Symbolic Link (Development)

```bash
cd ComfyUI/custom_nodes/
ln -s /path/to/fibo-control-net-visualizer/packages/comfyui-fibo-sweep ./fibo-sweep
```

## Usage

### Node 1: FIBO Parameter Sweep

This node generates all possible combinations of parameters for your sweep.

**Inputs:**
- `base_json` (required): Your base FIBO JSON configuration
- `parameter_1_path` (required): JSON path for first parameter (e.g., `camera.fov`)
- `parameter_1_values` (required): Comma-separated values (e.g., `25,35,45,55,65`)
- `parameter_2_path` (optional): JSON path for second parameter
- `parameter_2_values` (optional): Values for second parameter
- `parameter_3_path` (optional): JSON path for third parameter
- `parameter_3_values` (optional): Values for third parameter
- `grid_columns` (optional): Number of columns in grid layout (default: 5)

**Outputs:**
- `json_variants`: JSON string containing all variant configurations
- `total_count`: Total number of variants generated
- `metadata`: Metadata about the sweep (parameters, grid layout)

**Example:**
```json
Base JSON:
{
  "seed": 1337,
  "camera": { "fov": 35 },
  "lights": { "key": { "temperature": 5000 } }
}

Parameter 1: camera.fov = 25,35,45,55,65
Parameter 2: lights.key.temperature = 3000,4000,5000

Result: 15 variants (5 FOV values × 3 temperature values)
```

### Node 2: FIBO JSON Extractor

This node extracts individual variants from the sweep for batch processing.

**Inputs:**
- `json_variants`: Output from FIBO Parameter Sweep node
- `variant_index`: Which variant to extract (0-based index)

**Outputs:**
- `variant_json`: The complete JSON configuration for this variant
- `deltas_json`: Object showing which parameters changed from base

**Example Workflow:**

```
[FIBO Parameter Sweep]
    ↓ json_variants
[FIBO JSON Extractor] (index: 0)
    ↓ variant_json
[Your FIBO Generation Node]
    ↓
[Save Image]
```

For batch processing:
```
[FIBO Parameter Sweep] → total_count
    ↓
[Loop] (0 to total_count)
    ↓
[FIBO JSON Extractor] (index: loop_index)
    ↓
[FIBO Generate]
    ↓
[Save Image] (filename: variant_{index}.png)
```

## Example Workflows

### Simple 2D Sweep

```
Base: camera.fov = 35, lights.temperature = 5000

Sweep:
- camera.fov: 25, 35, 45, 55, 65
- lights.key.temperature: 3000, 4000, 5000, 6000

Result: 5×4 = 20 variants
```

### Advanced 3D Sweep

```
Base: camera.fov = 35, lights.temperature = 5000, seed = 1337

Sweep:
- camera.fov: 25, 45, 65
- lights.key.temperature: 3000, 5000, 6500
- seed: 100, 200, 300

Result: 3×3×3 = 27 variants
```

## Integration with FIBO Web Visualizer

This node can work standalone or export results compatible with the FIBO Web Visualizer:

1. Generate sweep in ComfyUI using FIBO Parameter Sweep node
2. Copy the `json_variants` output
3. Import into Web Visualizer for grid visualization and comparison
4. Export results back to ComfyUI for further processing

## Troubleshooting

### Node doesn't appear in ComfyUI

- Ensure the folder is in `ComfyUI/custom_nodes/`
- Restart ComfyUI completely
- Check ComfyUI console for Python errors

### Invalid JSON errors

- Validate your base JSON using a JSON validator
- Ensure proper escaping of quotes in JSON strings
- Check that paths exist in your base JSON structure

### Out of memory with large sweeps

- Reduce the number of parameters or values
- Process variants in batches using the extractor node
- Example: 5×5×5 = 125 variants may be too many for one batch

## Development

### Adding New Features

The nodes are designed to be extensible:

```python
# Add a new parameter type
class FIBOLogarithmicSweep(FIBOParameterSweep):
    def _parse_values(self, values_str: str) -> List[float]:
        # Custom logarithmic value generation
        start, end, count = values_str.split(',')
        return np.logspace(float(start), float(end), int(count))
```

### Testing

```python
# Test the sweep generation
node = FIBOParameterSweep()
result = node.generate_sweep(
    base_json='{"seed": 1337, "camera": {"fov": 35}}',
    parameter_1_path="camera.fov",
    parameter_1_values="25,35,45"
)
print(f"Generated {result[1]} variants")
```

## License

MIT License - See repository root for details

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/fibo-control-net-visualizer/issues
- Documentation: https://docs.your-site.com/comfyui-integration

## Contributing

Contributions welcome! Please submit PRs to the main repository.
