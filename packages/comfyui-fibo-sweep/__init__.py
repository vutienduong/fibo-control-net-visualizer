"""
FIBO Parameter Sweep Node for ComfyUI

This custom node enables multi-dimensional parameter sweeps
for FIBO image generation directly in ComfyUI workflows.
"""

from .fibo_sweep_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
