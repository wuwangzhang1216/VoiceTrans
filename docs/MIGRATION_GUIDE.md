# VoiceTrans v2.0 迁移指南

## 📋 概述

本指南帮助您从旧版本迁移到 v2.0 优化架构。所有更改都是向后兼容的,可以渐进式升级。

## 🚀 快速开始

### 1. 更新依赖

```bash
cd /path/to/VoiceTrans
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件,填入你的 API keys
nano .env
```

最低配置:
```env
FIREWORKS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### 3. 测试新架构

```bash
# 启动后端
cd web_app/backend
python main.py

# 访问健康检查
curl http://localhost:8000/health
```

### 4. (可选) 清理旧文件

```bash
cd web_app/backend
bash archive_old_files.sh
```

## 📊 API 变更

### 向后兼容性

所有旧的 API endpoints 都保留了:
```
✅ GET  /                  # 仍然可用
✅ GET  /languages         # 仍然可用
✅ GET  /stats             # 仍然可用
✅ POST /config            # 仍然可用
✅ WS   /ws                # 仍然可用
```

### 新的 v1 API (推荐使用)

```
🆕 GET    /health              # 详细健康检查
🆕 GET    /v1/languages        # 支持的语言
🆕 GET    /v1/stats            # 详细统计
🆕 POST   /v1/config           # 更新配置
🆕 DELETE /v1/cache            # 清空缓存
🆕 WS     /v1/ws/stream        # WebSocket流 (增强)
🆕 GET    /v1/connections      # 活跃连接
🆕 GET    /v1/connections/:id  # 连接详情
```

## 🔧 前端迁移

### 使用新的 Hooks

#### 1. WebSocket 连接

**旧方式**:
```typescript
const [socket, setSocket] = useState<WebSocket | null>(null)
const [isConnected, setIsConnected] = useState(false)

useEffect(() => {
  const ws = new WebSocket(url)
  ws.onopen = () => setIsConnected(true)
  ws.onclose = () => setIsConnected(false)
  setSocket(ws)
  return () => ws.close()
}, [url])
```

**新方式** (推荐):
```typescript
import { useWebSocket } from '@/hooks'

const { socket, status, connect, disconnect, sendMessage } = useWebSocket({
  url: WS_URL,
  onMessage: handleMessage,
  autoReconnect: true
})

// 连接管理变得简单
useEffect(() => {
  connect()
  return () => disconnect()
}, [])
```

#### 2. 音频录制

**旧方式**:
```typescript
// 复杂的 AudioContext 和 AudioWorklet 设置...
const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
// 大量的样板代码...
```

**新方式** (推荐):
```typescript
import { useAudioRecorder } from '@/hooks'

const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder({
  onAudioData: (pcm) => sendToBackend(pcm),
  onAudioLevel: (level) => updateVisualizer(level)
})
```

#### 3. 翻译管理

**旧方式**:
```typescript
const [translations, setTranslations] = useState<Translation[]>([])
const [stats, setStats] = useState(...)

const addTranslation = (entry) => {
  setTranslations(prev => [...prev, entry])
  // 手动更新统计...
}
```

**新方式** (推荐):
```typescript
import { useTranslation } from '@/hooks'

const {
  translations,
  stats,
  addTranslation,
  clearTranslations,
  exportTranslations,
  searchTranslations
} = useTranslation()

// 自动计算统计,支持导出和搜索
```

### 使用共享组件

#### VoiceTransLogo

```typescript
import { VoiceTransLogo } from '@/components/shared'

// 响应音频等级
<VoiceTransLogo
  size="large"
  levels={audioLevels}  // [0.2, 0.4, 0.8, 0.4, 0.2]
  animated
/>
```

#### AudioVisualizer

```typescript
import { AudioVisualizer } from '@/components/shared'

<AudioVisualizer
  level={audioLevel}  // 0-1
  isActive={isRecording}
/>
```

#### TranslationDisplay

```typescript
import { TranslationDisplay } from '@/components/shared'

<TranslationDisplay
  translation={{
    transcription: "Hello",
    translation: "你好",
    latency: 0.5,
    processing_speed: 10.2
  }}
  isActive={isRecording}
/>
```

## 🔐 安全性更新

### CORS 配置

**生产环境** - 使用白名单:
```python
# config/settings.py
cors_origins = [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
]
```

**开发环境** - 允许 localhost:
```env
DEBUG=true
# 自动允许所有来源
```

### API Key 管理

**不推荐** (旧方式):
```typescript
// 前端存储 API keys ❌
const apiConfig = {
  fireworks_api_key: "sk-...",
  gemini_api_key: "AIza..."
}
```

**推荐** (新方式):
```env
# .env 文件 ✅
FIREWORKS_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

### 速率限制

新增的速率限制:
- 标准 API: 60次/分钟
- 配置更新: 10次/分钟
- 缓存清理: 5次/分钟

如果超出限制,将返回 429 错误。

## 📈 性能优化建议

### 1. 启用缓存

```env
ENABLE_CACHE=true
CACHE_TTL=3600
```

**效果**: 减少 30-50% 的 API 调用

### 2. 调整音频参数

```env
# 更高质量但更慢
AUDIO_SAMPLE_RATE=24000
AUDIO_CHUNK_DURATION=3.0

# 更快响应但质量略低
AUDIO_SAMPLE_RATE=16000
AUDIO_CHUNK_DURATION=2.0
```

### 3. WebSocket 心跳

```env
# 更频繁的心跳检测 (更快发现断线)
WEBSOCKET_HEARTBEAT_INTERVAL=15

# 较少的心跳检测 (减少网络开销)
WEBSOCKET_HEARTBEAT_INTERVAL=60
```

## 🧪 测试迁移

### 1. 健康检查

```bash
curl http://localhost:8000/health
```

期望输出:
```json
{
  "healthy": true,
  "services": {
    "transcription": { "initialized": true, "client_ready": true },
    "translation": { "initialized": true, "client_ready": true },
    "streaming": { "initialized": true }
  }
}
```

### 2. 测试缓存

```bash
# 第一次调用
time curl -X POST http://localhost:8000/v1/translate -F "file=@test.wav"

# 第二次调用 (应该更快)
time curl -X POST http://localhost:8000/v1/translate -F "file=@test.wav"
```

### 3. 查看统计

```bash
curl http://localhost:8000/v1/stats
```

检查:
- `cache_hits` > 0 (缓存工作)
- `api_errors` = 0 (无错误)
- `avg_latency` < 2.0 (性能良好)

## 🐛 常见问题

### Q1: "Services not initialized" 错误

**原因**: API keys 未配置

**解决**:
```bash
# 检查 .env 文件
cat .env | grep API_KEY

# 或通过 API 配置
curl -X POST http://localhost:8000/config \
  -H "Content-Type: application/json" \
  -d '{"fireworks_api_key": "sk-...", "gemini_api_key": "AIza..."}'
```

### Q2: WebSocket 频繁断开

**原因**: 防火墙或代理限制

**解决**:
```env
# 增加心跳间隔
WEBSOCKET_HEARTBEAT_INTERVAL=60

# 增加重连次数
WEBSOCKET_MAX_RECONNECT_ATTEMPTS=10
```

### Q3: 音频处理延迟高

**原因**: 音频参数设置过高

**解决**:
```env
# 降低采样率
AUDIO_SAMPLE_RATE=16000

# 减少chunk时长
AUDIO_CHUNK_DURATION=1.5
```

### Q4: 缓存不工作

**检查**:
```bash
# 1. 确认缓存已启用
curl http://localhost:8000/v1/stats | jq '.cache_hits'

# 2. 检查配置
curl http://localhost:8000/ | jq '.services'

# 3. 清理缓存重试
curl -X DELETE http://localhost:8000/v1/cache
```

## 📊 监控与维护

### 关键指标

定期检查以下指标:

```bash
# 获取统计
curl http://localhost:8000/v1/stats | jq '.'
```

**健康指标**:
- `cache_hits / (cache_hits + cache_misses)` > 0.3 (缓存命中率)
- `api_errors / api_calls` < 0.05 (错误率)
- `avg_latency` < 2.0 (平均延迟)

**警告信号**:
- 错误率 > 10%
- 平均延迟 > 5秒
- 缓存命中率 < 10%

### 日志监控

```bash
# 查看实时日志
tail -f /var/log/voicetrans.log

# 筛选错误
grep ERROR /var/log/voicetrans.log

# 统计错误类型
grep ERROR /var/log/voicetrans.log | cut -d' ' -f5- | sort | uniq -c
```

## 🔄 回滚方案

如果遇到问题需要回滚:

### 1. 恢复旧版本

```bash
cd web_app/backend
cp _archived_20251007/main_streaming.py main.py
```

### 2. 还原依赖

```bash
git checkout HEAD~1 requirements.txt
pip install -r requirements.txt
```

### 3. 重启服务

```bash
pkill -f "python main.py"
python main.py &
```

## 📞 获取帮助

如果遇到问题:

1. **查看文档**: `docs/OPTIMIZATION_SUMMARY.md`
2. **检查健康状态**: `curl http://localhost:8000/health`
3. **查看日志**: 检查应用日志文件
4. **提交 Issue**: 在 GitHub 仓库提交问题

## ✅ 迁移检查清单

- [ ] 更新依赖 (`pip install -r requirements.txt`)
- [ ] 创建 .env 文件并配置 API keys
- [ ] 测试健康检查端点
- [ ] 验证 WebSocket 连接
- [ ] 测试音频录制和翻译
- [ ] 检查缓存工作状态
- [ ] 查看统计指标
- [ ] (可选) 更新前端使用新 hooks
- [ ] (可选) 清理旧文件
- [ ] 部署到生产环境
- [ ] 监控运行状态

---

**最后更新**: 2025-10-07
**适用版本**: v2.0.0+
**向后兼容**: ✅ 完全兼容
