This extensions aims to do code completion using local llm

1. Run llama.cpp server and model 
```python 
llama_cpp.server --model models/mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35- 
```
2. Send page content or cell content to the server. Wait for inference and response. 
3. Make response appear as ghost completion in copilot fashion. 