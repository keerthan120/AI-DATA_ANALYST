import os
import sys
from pathlib import Path

# Disable all third-party setuptools pytest plugins (like deepeval) that crash on import
os.environ["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import pytest

if __name__ == "__main__":
    print("Running AI Data Analyst Test Suite...")
    exit_code = pytest.main([
        str(backend_dir / "tests"),
        "-v",
    ])
    sys.exit(exit_code)
