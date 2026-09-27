"""
SkyResQ Backend Application Package
AI-Powered Aerial Rescue & Situational Awareness System
"""

import sys
import os

# Ensure project root is in sys.path so 'ai' package is always discoverable
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

__version__ = "0.1.0"
__author__ = "SkyResQ Development Team"
