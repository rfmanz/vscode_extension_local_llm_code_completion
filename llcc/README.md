This extension aims to do code completion using a local llm

1. Create extension toggle to start and stop [llama.cpp server](https://github.com/abetlen/llama-cpp-python) and model 
```python 
llama_cpp.server --model models/mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35- 
```
2. Send page content or cell content to the server. Wait for inference and response. 
3. Make response appear as ghost completion a la copilot. 


https://thakkarparth007.github.io/copilot-explorer/posts/copilot-internals#inlineghosttext

https://thakkarparth007.github.io/copilot-explorer/codeviz/templates/code-viz.html#m4969&pos=172:6

