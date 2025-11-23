"""
FIBO Parameter Sweep Node for ComfyUI
"""

import json
import itertools
from typing import Dict, List, Any, Tuple


class FIBOParameterSweep:
    """
    A ComfyUI node that generates parameter sweeps for FIBO image generation
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "base_json": ("STRING", {
                    "multiline": True,
                    "default": json.dumps({
                        "seed": 1337,
                        "camera": {"fov": 35, "angle": "eye_level"},
                        "lights": {"key": {"temperature": 5000, "intensity": 0.9}},
                        "subject": {"description": "ceramic bottle"}
                    }, indent=2)
                }),
                "parameter_1_path": ("STRING", {"default": "camera.fov"}),
                "parameter_1_values": ("STRING", {"default": "25,35,45,55,65"}),
            },
            "optional": {
                "parameter_2_path": ("STRING", {"default": "lights.key.temperature"}),
                "parameter_2_values": ("STRING", {"default": "3000,4000,5000,6000"}),
                "parameter_3_path": ("STRING", {"default": ""}),
                "parameter_3_values": ("STRING", {"default": ""}),
                "grid_columns": ("INT", {"default": 5, "min": 1, "max": 20}),
            }
        }

    RETURN_TYPES = ("STRING", "INT", "STRING")
    RETURN_NAMES = ("json_variants", "total_count", "metadata")
    FUNCTION = "generate_sweep"
    CATEGORY = "FIBO/Parameter Sweep"

    def generate_sweep(
        self,
        base_json: str,
        parameter_1_path: str,
        parameter_1_values: str,
        parameter_2_path: str = "",
        parameter_2_values: str = "",
        parameter_3_path: str = "",
        parameter_3_values: str = "",
        grid_columns: int = 5
    ) -> Tuple[str, int, str]:
        """
        Generate all parameter combinations for sweep
        """
        try:
            base_dict = json.loads(base_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid base JSON: {e}")

        # Parse parameters
        parameters = []
        if parameter_1_path and parameter_1_values:
            parameters.append({
                "path": parameter_1_path,
                "values": self._parse_values(parameter_1_values)
            })

        if parameter_2_path and parameter_2_values:
            parameters.append({
                "path": parameter_2_path,
                "values": self._parse_values(parameter_2_values)
            })

        if parameter_3_path and parameter_3_values:
            parameters.append({
                "path": parameter_3_path,
                "values": self._parse_values(parameter_3_values)
            })

        if not parameters:
            raise ValueError("At least one parameter must be specified")

        # Generate all combinations
        value_lists = [p["values"] for p in parameters]
        combinations = list(itertools.product(*value_lists))

        variants = []
        for combo in combinations:
            variant = json.loads(json.dumps(base_dict))  # Deep copy
            deltas = {}

            for i, param in enumerate(parameters):
                value = combo[i]
                self._set_nested_value(variant, param["path"], value)
                deltas[param["path"]] = value

            variants.append({
                "json": variant,
                "deltas": deltas
            })

        # Create metadata
        metadata = {
            "total_variants": len(variants),
            "parameters": [p["path"] for p in parameters],
            "grid_layout": {
                "columns": grid_columns,
                "rows": (len(variants) + grid_columns - 1) // grid_columns
            }
        }

        # Convert variants to JSON string
        variants_json = json.dumps(variants, indent=2)
        metadata_json = json.dumps(metadata, indent=2)

        return (variants_json, len(variants), metadata_json)

    def _parse_values(self, values_str: str) -> List[float]:
        """Parse comma-separated values"""
        try:
            return [float(v.strip()) for v in values_str.split(",") if v.strip()]
        except ValueError as e:
            raise ValueError(f"Invalid values format: {e}")

    def _set_nested_value(self, obj: Dict, path: str, value: Any) -> None:
        """Set a nested value using dot notation path"""
        keys = path.split(".")
        current = obj

        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        current[keys[-1]] = value


class FIBOJSONExtractor:
    """
    Extract individual JSON variants from sweep results for batch processing
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "json_variants": ("STRING", {"forceInput": True}),
                "variant_index": ("INT", {"default": 0, "min": 0}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("variant_json", "deltas_json")
    FUNCTION = "extract_variant"
    CATEGORY = "FIBO/Parameter Sweep"

    def extract_variant(self, json_variants: str, variant_index: int) -> Tuple[str, str]:
        """Extract a single variant from the sweep"""
        try:
            variants = json.loads(json_variants)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON variants: {e}")

        if variant_index >= len(variants):
            raise ValueError(f"Variant index {variant_index} out of range (max: {len(variants) - 1})")

        variant = variants[variant_index]
        variant_json = json.dumps(variant["json"], indent=2)
        deltas_json = json.dumps(variant["deltas"], indent=2)

        return (variant_json, deltas_json)


# Node registration for ComfyUI
NODE_CLASS_MAPPINGS = {
    "FIBOParameterSweep": FIBOParameterSweep,
    "FIBOJSONExtractor": FIBOJSONExtractor,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FIBOParameterSweep": "FIBO Parameter Sweep",
    "FIBOJSONExtractor": "FIBO JSON Extractor",
}
