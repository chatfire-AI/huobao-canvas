#!/usr/bin/env python3
"""
huobao-canvas 图生图 API 调用示例
支持两种格式：JSON+Base64 和 multipart/form-data
"""

import os
import base64
import requests

# 配置
API_KEY = "tp-c6v7pqatc2oihxvf10epq99smqtfwgvupofw2w31cw7ajkr9"
BASE_URL = "https://api.xiaomimimo.com/v1"  # 或您的代理地址

def image_to_base64(image_path):
    """将图片转换为 base64"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def image_generation_json(image_path, prompt, model="gpt-image-2"):
    """
    方式 1: JSON + Base64 格式
    适用于：/v1/images/generations 端点
    """
    image_b64 = image_to_base64(image_path)
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "prompt": prompt,
        "image": f"data:image/jpeg;base64,{image_b64}",
        "n": 1,
        "size": "1024x1024"
    }
    
    response = requests.post(
        f"{BASE_URL}/v1/images/generations",
        headers=headers,
        json=payload
    )
    
    return response.json()

def image_generation_multipart(image_path, prompt, model="gpt-image-2"):
    """
    方式 2: multipart/form-data 格式（推荐）
    适用于：/v1/images/edits 端点，gpt-image-2 模型
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}"
        # 注意：不要设置 Content-Type，requests 会自动设置 boundary
    }
    
    files = {
        "image": ("image.jpg", open(image_path, "rb"), "image/jpeg")
    }
    
    data = {
        "model": model,
        "prompt": prompt,
        "n": "1",
        "size": "1024x1024"
    }
    
    response = requests.post(
        f"{BASE_URL}/v1/images/edits",
        headers=headers,
        files=files,
        data=data
    )
    
    return response.json()

def save_result(result, output_path="output.jpg"):
    """保存结果图片"""
    if "data" in result:
        image_data = result["data"][0]
        
        # 如果是 URL
        if "url" in image_data:
            img_response = requests.get(image_data["url"])
            with open(output_path, "wb") as f:
                f.write(img_response.content)
            print(f"✅ 图片已保存到：{output_path}")
            
        # 如果是 base64
        elif "b64_json" in image_data:
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(image_data["b64_json"]))
            print(f"✅ 图片已保存到：{output_path}")
    
    return output_path

if __name__ == "__main__":
    # 示例用法
    input_image = "/root/input.jpg"  # 替换为您的输入图片路径
    prompt = "专业产品精修，去除划痕和瑕疵，白色无缝背景"
    
    print("=== 测试图生图 API ===")
    print(f"输入图片：{input_image}")
    print(f"提示词：{prompt}")
    print()
    
    if not os.path.exists(input_image):
        print(f"❌ 输入图片不存在：{input_image}")
        print("请先准备一张测试图片")
        exit(1)
    
    # 方式 1: JSON + Base64
    print("1️⃣ 测试 JSON + Base64 格式...")
    result1 = image_generation_json(input_image, prompt)
    if "error" in result1:
        print(f"❌ 错误：{result1['error']['message']}")
    else:
        print("✅ 请求成功")
        save_result(result1, "/root/.hermes/image_cache/output_json.jpg")
    
    print()
    
    # 方式 2: multipart/form-data
    print("2️⃣ 测试 multipart/form-data 格式...")
    result2 = image_generation_multipart(input_image, prompt)
    if "error" in result2:
        print(f"❌ 错误：{result2['error']['message']}")
    else:
        print("✅ 请求成功")
        save_result(result2, "/root/.hermes/image_cache/output_multipart.jpg")
    
    print()
    print("=== 测试完成 ===")