"""Runs one request through the Python grading harness (the same code the browser runs in Pyodide)."""
import sys, importlib.util
spec = importlib.util.spec_from_file_location('h', sys.argv[1])
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
print(h.dispatch(sys.stdin.read()))
