/**
 * API 代码示例模板
 * 用于生成不同编程语言的 API 调用代码
 */

import { PUBLIC_API_BASE_URL } from './apiBaseUrl.js'

/**
 * 协议簇鉴权头映射（Task 9）
 * auth：主鉴权头，`<API_KEY>` 为占位符，生成时替换为 apiKey
 * extra：附加头（如 claude 的 anthropic-version、dashscope 异步任务的 X-DashScope-Async）
 */
export const protocolHeaderMap = {
  'openai-chat': { auth: 'Authorization: Bearer <API_KEY>' },
  'openai-responses': { auth: 'Authorization: Bearer <API_KEY>' },
  claude: { auth: 'x-api-key: <API_KEY>', extra: ['anthropic-version: 2023-06-01'] },
  'openai-image': { auth: 'Authorization: Bearer <API_KEY>' },
  gemini: { auth: 'x-goog-api-key: <API_KEY>' },
  dashscope: { auth: 'Authorization: Bearer <API_KEY>', extra: ['X-DashScope-Async: enable'] },
  ark: { auth: 'Authorization: Bearer <API_KEY>' },
  'async-video': { auth: 'Authorization: Bearer <API_KEY>' },
}

const getProtocolSpec = (protocolKey) => protocolHeaderMap[protocolKey] || protocolHeaderMap['openai-chat']

// 把协议头规范解析为 { name, value } 数组，value 中的 <API_KEY> 替换为 apiKey
const toHeaderEntries = (protocolKey, apiKey) => {
  const { auth, extra = [] } = getProtocolSpec(protocolKey)
  return [auth, ...extra].map((line) => {
    const idx = line.indexOf(':')
    return { name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim().replaceAll('<API_KEY>', apiKey) }
  })
}

// 各语言把协议头渲染成自身语法的行
const curlHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `--header '${name}: ${value}'`)
const jsHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `myHeaders.append("${name}", "${value}");`)
const jsObjectHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `    "${name}": "${value}",`)
const pythonHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `    "${name}": "${value}",`)
const javaHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `        conn.setRequestProperty("${name}", "${value}");`)
const goHeaders = (protocolKey, apiKey) =>
  toHeaderEntries(protocolKey, apiKey).map(({ name, value }) => `    req.Header.Add("${name}", "${value}")`)

/**
 * 生成 JavaScript 代码 (fetch API)
 */
const generateJavaScriptCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj }
  const jsonStr = JSON.stringify(bodyObj, null, 2)
  const headerLines = [...jsHeaders(protocolKey, apiKey), 'myHeaders.append("Content-Type", "application/json");']

  return `var myHeaders = new Headers();
${headerLines.join('\n')}

var raw = JSON.stringify(${jsonStr});

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: raw,
  redirect: 'follow'
};

fetch("${baseUrl}${endpoint}", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`
}

/**
 * 生成 Python 代码
 */
const generatePythonCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj }
  const pythonParams = JSON.stringify(bodyObj, null, 4)
    .replace(/: true/g, ': True')
    .replace(/: false/g, ': False')
    .replace(/: null/g, ': None')
  const headerLines = [...pythonHeaders(protocolKey, apiKey), '    "Content-Type": "application/json"']

  return `import requests
import json

url = "${baseUrl}${endpoint}"

headers = {
${headerLines.join('\n')}
}

payload = ${pythonParams}

response = requests.post(url, headers=headers, json=payload)

print(response.text)`
}

/**
 * 生成 cURL 代码
 */
const generateCurlCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj }
  const jsonBody = JSON.stringify(bodyObj, null, 4)
  const headerLines = [...curlHeaders(protocolKey, apiKey), "--header 'Content-Type: application/json'"].join(' \\\n')

  return `curl --location --request POST '${baseUrl}${endpoint}' \\
${headerLines} \\
--data-raw '${jsonBody}'`
}

/**
 * 生成 Java 代码
 */
const generateJavaCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj }
  const jsonBody = JSON.stringify(bodyObj)
  const headerLines = [...javaHeaders(protocolKey, apiKey), '        conn.setRequestProperty("Content-Type", "application/json");']

  return `import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public class Main {
    public static void main(String[] args) throws Exception {
        URL url = new URL("${baseUrl}${endpoint}");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
${headerLines.join('\n')}
        conn.setDoOutput(true);
        
        String jsonBody = "${jsonBody.replace(/"/g, '\\"')}";
        
        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes("UTF-8"));
        }
        
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            System.out.println(response.toString());
        }
    }
}`
}

/**
 * 生成 Go 代码
 */
const generateGoCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj }
  const jsonBody = JSON.stringify(bodyObj)
  const headerLines = [...goHeaders(protocolKey, apiKey), '    req.Header.Add("Content-Type", "application/json")']

  return `package main

import (
    "fmt"
    "strings"
    "net/http"
    "io/ioutil"
)

func main() {
    url := "${baseUrl}${endpoint}"

    payload := strings.NewReader(\`${jsonBody}\`)

    req, _ := http.NewRequest("POST", url, payload)

${headerLines.join('\n')}

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()

    body, _ := ioutil.ReadAll(res.Body)
    fmt.Println(string(body))
}`
}

/**
 * 生成 FormData 格式的 JavaScript 代码
 */
const generateJavaScriptFormDataCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params

  const headerLines = jsHeaders(protocolKey, apiKey)
  let formDataLines = [`formdata.append("model", "${modelName}");`]
  for (const [key, value] of Object.entries(paramsObj)) {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const fieldName = key === 'image' ? 'image[]' : `${key}[${idx}]`
        if (typeof item === 'object') {
          formDataLines.push(`formdata.append("${fieldName}", JSON.stringify(${JSON.stringify(item)}));`)
        } else {
          formDataLines.push(`formdata.append("${fieldName}", "${item}");`)
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      formDataLines.push(`formdata.append("${key}", JSON.stringify(${JSON.stringify(value)}));`)
    } else if (value !== undefined && value !== null && value !== '') {
      key !== "model" && formDataLines.push(`formdata.append("${key}", "${value}");`)
    }
  }
  
  return `var myHeaders = new Headers();
${headerLines.join('\n')}

var formdata = new FormData();
${formDataLines.join('\n')}

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: formdata,
  redirect: 'follow'
};

fetch("${baseUrl}${endpoint}", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`
}

/**
 * 生成 FormData 格式的 Python 代码
 */
const generatePythonFormDataCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params

  const headerLines = pythonHeaders(protocolKey, apiKey)
  let formDataLines = [`    ('model', '${modelName}'),`]
  for (const [key, value] of Object.entries(paramsObj)) {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const fieldName = key === 'image' ? 'image[]' : `${key}[${idx}]`
        if (typeof item === 'object') {
          formDataLines.push(`    ('${fieldName}', json.dumps(${JSON.stringify(item).replace(/: true/g, ': True').replace(/: false/g, ': False').replace(/: null/g, ': None')})),`)
        } else {
          formDataLines.push(`    ('${fieldName}', '${item}'),`)
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      formDataLines.push(`    ('${key}', json.dumps(${JSON.stringify(value).replace(/: true/g, ': True').replace(/: false/g, ': False').replace(/: null/g, ': None')})),`)
    } else if (value !== undefined && value !== null && value !== '') {
      key !== "model" && formDataLines.push(`    ('${key}', '${value}'),`)
    }
  }
  
  return `import requests
import json

url = "${baseUrl}${endpoint}"

headers = {
${headerLines.join('\n')}
}

payload = [
${formDataLines.join('\n')}
]

response = requests.post(url, headers=headers, data=payload)

print(response.text)`
}

/**
 * 生成 FormData 格式的 cURL 代码
 */
const generateCurlFormDataCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params

  const headerLines = curlHeaders(protocolKey, apiKey).join(' \\\n')
  let formLines = [`--form 'model="${modelName}"'`]
  for (const [key, value] of Object.entries(paramsObj)) {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const fieldName = key === 'image' ? 'image[]' : `${key}[${idx}]`
        if (typeof item === 'object') {
          formLines.push(`--form '${fieldName}="${JSON.stringify(item).replace(/'/g, "\\'")}"'`)
        } else {
          formLines.push(`--form '${fieldName}="${item}"'`)
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      formLines.push(`--form '${key}="${JSON.stringify(value).replace(/'/g, "\\'")}"'`)
    } else if (value !== undefined && value !== null && value !== '') {
      key !== "model" && formLines.push(`--form '${key}="${value}"'`)
    }
  }
  
  return `curl --location --request POST '${baseUrl}${endpoint}' \\
${headerLines} \\
${formLines.join(' \\\n')}`
}

// ==================== 流式代码模板（SSE） ====================

/**
 * 生成流式 cURL 代码
 */
const generateCurlStreamCode = (modelName, params, endpoint = '/v1/chat/completions', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj, stream: true }
  const jsonBody = JSON.stringify(bodyObj, null, 4)
  const headerLines = [
    ...curlHeaders(protocolKey, apiKey),
    "--header 'Content-Type: application/json'",
    '--no-buffer',
  ].join(' \\\n')

  return `curl --location --request POST '${baseUrl}${endpoint}' \\
${headerLines} \\
--data-raw '${jsonBody}'`
}

/**
 * 生成流式 JavaScript 代码 (fetch + ReadableStream)
 */
const generateJavaScriptStreamCode = (modelName, params, endpoint = '/v1/chat/completions', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj, stream: true }
  const jsonStr = JSON.stringify(bodyObj, null, 2)
  const headerLines = [...jsObjectHeaders(protocolKey, apiKey), '    "Content-Type": "application/json"']

  return `const response = await fetch("${baseUrl}${endpoint}", {
  method: "POST",
  headers: {
${headerLines.join('\n')}
  },
  body: JSON.stringify(${jsonStr})
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split("\\n")) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content || "";
        console.log(content);
      } catch {}
    }
  }
}`
}

/**
 * 生成流式 Python 代码
 */
const generatePythonStreamCode = (modelName, params, endpoint = '/v1/chat/completions', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj, stream: true }
  const pythonParams = JSON.stringify(bodyObj, null, 4)
    .replace(/: true/g, ': True')
    .replace(/: false/g, ': False')
    .replace(/: null/g, ': None')
  const headerLines = [...pythonHeaders(protocolKey, apiKey), '    "Content-Type": "application/json"']

  return `import requests
import json

url = "${baseUrl}${endpoint}"

headers = {
${headerLines.join('\n')}
}

payload = ${pythonParams}

response = requests.post(url, headers=headers, json=payload, stream=True)

for line in response.iter_lines():
    if line:
        line = line.decode("utf-8")
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                print(content, end="", flush=True)
            except json.JSONDecodeError:
                pass`
}

/**
 * 生成流式 Java 代码
 */
const generateJavaStreamCode = (modelName, params, endpoint = '/v1/chat/completions', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj, stream: true }
  const jsonBody = JSON.stringify(bodyObj)
  const headerLines = [...javaHeaders(protocolKey, apiKey), '        conn.setRequestProperty("Content-Type", "application/json");']

  return `import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public class Main {
    public static void main(String[] args) throws Exception {
        URL url = new URL("${baseUrl}${endpoint}");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
${headerLines.join('\n')}
        conn.setDoOutput(true);

        String jsonBody = "${jsonBody.replace(/"/g, '\\"')}";

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes("UTF-8"));
        }

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("data: ")) {
                    String data = line.substring(6);
                    if (data.equals("[DONE]")) break;
                    // Parse JSON and extract content
                    System.out.print(data);
                }
            }
        }
    }
}`
}

/**
 * 生成流式 Go 代码
 */
const generateGoStreamCode = (modelName, params, endpoint = '/v1/chat/completions', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const bodyObj = { model: modelName, ...paramsObj, stream: true }
  const jsonBody = JSON.stringify(bodyObj)
  const headerLines = [...goHeaders(protocolKey, apiKey), '    req.Header.Add("Content-Type", "application/json")']

  return `package main

import (
    "bufio"
    "fmt"
    "net/http"
    "strings"
)

func main() {
    url := "${baseUrl}${endpoint}"

    payload := strings.NewReader(\`${jsonBody}\`)

    req, _ := http.NewRequest("POST", url, payload)

${headerLines.join('\n')}

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()

    scanner := bufio.NewScanner(res.Body)
    for scanner.Scan() {
        line := scanner.Text()
        if strings.HasPrefix(line, "data: ") {
            data := line[6:]
            if data == "[DONE]" {
                break
            }
            fmt.Print(data)
        }
    }
}`
}

// ==================== Java/Go FormData 代码模板 ====================

/**
 * 生成 FormData 格式的 Java 代码
 */
const generateJavaFormDataCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params
  const boundary = '----FormBoundary7MA4YWxkTrZu0gW'

  const headerLines = javaHeaders(protocolKey, apiKey)
  let fieldLines = []
  fieldLines.push(`        addFormField(body, boundary, "model", "${modelName}");`)
  for (const [key, value] of Object.entries(paramsObj)) {
    if (value !== undefined && value !== null && value !== '' && key !== 'model') {
      const val = typeof value === 'object' ? JSON.stringify(value).replace(/"/g, '\\"') : value
      fieldLines.push(`        addFormField(body, boundary, "${key}", "${val}");`)
    }
  }

  return `import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public class Main {
    public static void main(String[] args) throws Exception {
        String boundary = "${boundary}";
        URL url = new URL("${baseUrl}${endpoint}");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
${headerLines.join('\n')}
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        conn.setDoOutput(true);

        StringBuilder body = new StringBuilder();
${fieldLines.join('\n')}
        body.append("--").append(boundary).append("--\\r\\n");

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes("UTF-8"));
        }

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            System.out.println(response.toString());
        }
    }

    static void addFormField(StringBuilder body, String boundary, String name, String value) {
        body.append("--").append(boundary).append("\\r\\n");
        body.append("Content-Disposition: form-data; name=\\"").append(name).append("\\"\\r\\n\\r\\n");
        body.append(value).append("\\r\\n");
    }
}`
}

/**
 * 生成 FormData 格式的 Go 代码
 */
const generateGoFormDataCode = (modelName, params, endpoint = '/v1/images/generations', apiKey = '<token>', baseUrl = PUBLIC_API_BASE_URL, protocolKey = 'openai-chat') => {
  const paramsObj = typeof params === 'string' ? JSON.parse(params) : params

  const headerLines = goHeaders(protocolKey, apiKey)
  let fieldLines = [`    writer.WriteField("model", "${modelName}")`]
  for (const [key, value] of Object.entries(paramsObj)) {
    if (value !== undefined && value !== null && value !== '' && key !== 'model') {
      const val = typeof value === 'object' ? JSON.stringify(value).replace(/`/g, '` + "`" + `') : value
      fieldLines.push(`    writer.WriteField("${key}", \`${val}\`)`)
    }
  }

  return `package main

import (
    "bytes"
    "fmt"
    "io/ioutil"
    "mime/multipart"
    "net/http"
)

func main() {
    url := "${baseUrl}${endpoint}"

    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)

${fieldLines.join('\n')}

    writer.Close()

    req, _ := http.NewRequest("POST", url, body)

${headerLines.join('\n')}
    req.Header.Add("Content-Type", writer.FormDataContentType())

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()

    respBody, _ := ioutil.ReadAll(res.Body)
    fmt.Println(string(respBody))
}`
}

/**
 * 根据语言获取代码生成函数
 * @param {string} language 目标语言（javascript/python/curl/java/go）
 * @param {boolean} useFormData 是否使用 FormData 格式
 * @param {boolean} streaming 是否流式
 * @param {string} protocolKey 协议簇 key（openai-chat/claude/gemini/dashscope/...），决定鉴权头
 */
export const getCodeGenerator = (language, useFormData = false, streaming = false, protocolKey = 'openai-chat') => {
  const bind = (gen) => (modelName, params, endpoint, apiKey, baseUrl) =>
    gen(modelName, params, endpoint, apiKey, baseUrl, protocolKey)

  if (streaming) {
    const generators = {
      javascript: generateJavaScriptStreamCode,
      python: generatePythonStreamCode,
      curl: generateCurlStreamCode,
      java: generateJavaStreamCode,
      go: generateGoStreamCode
    }
    return bind(generators[language] || generateJavaScriptStreamCode)
  }

  if (useFormData) {
    const generators = {
      javascript: generateJavaScriptFormDataCode,
      python: generatePythonFormDataCode,
      curl: generateCurlFormDataCode,
      java: generateJavaFormDataCode,
      go: generateGoFormDataCode
    }
    return bind(generators[language] || generateJavaScriptFormDataCode)
  }

  const generators = {
    javascript: generateJavaScriptCode,
    python: generatePythonCode,
    curl: generateCurlCode,
    java: generateJavaCode,
    go: generateGoCode
  }
  return bind(generators[language] || generateJavaScriptCode)
}

/**
 * 语言到 Prism.js 语言映射
 */
export const languageMap = {
  javascript: 'javascript',
  python: 'python',
  curl: 'bash',
  java: 'java',
  go: 'go',
  json: 'json'
}
