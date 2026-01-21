// src/juliusApi.js
class JuliusAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.julius.ai';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Origin': 'https://julius.ai'
    };
  }

  async startConversation(model = 'default') {
    const payload = {
      provider: model,
      server_type: 'CPU',
      template_id: null,
      chat_type: null,
      conversation_plan: null,
      tool_preferences: { model: model !== 'default' ? model : null }
    };
    const response = await fetch(`${this.baseUrl}/api/chat/start`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Failed to start conversation: ${response.statusText}`);
    const data = await response.json();
    return data.id;
  }

  async uploadFile(file) {
    // Normalize filename
    const normalizedFilename = file.name.replace(/\s+/g, ' ').trim();
    const mimeType = file.type || 'application/octet-stream';

    // Get signed URL
    const signedUrlResponse = await fetch(`${this.baseUrl}/files/signed_url`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filename: normalizedFilename, mimeType })
    });
    if (!signedUrlResponse.ok) throw new Error('Failed to get signed URL');
    const { signedUrl } = await signedUrlResponse.json();

    // Upload file
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': mimeType }
    });
    if (!uploadResponse.ok) throw new Error('File upload failed');

    // Preprocess file
    const preprocessResponse = await fetch(`${this.baseUrl}/files/preprocess_file`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filename: normalizedFilename, conversationId: null, analyze: true })
    });
    if (!preprocessResponse.ok) throw new Error('File preprocessing failed');

    return normalizedFilename;
  }

  async sendMessage(conversationId, message, filePaths = [], model = 'default', advancedReasoning = false) {
    const headers = { ...this.headers, 'conversation-id': conversationId };
    const newAttachments = {};

    // Upload files if provided
    for (const filePath of filePaths) {
      const filename = await this.uploadFile(filePath);
      newAttachments[filename] = { name: filename, isUploading: false, percentComplete: 100 };
      // Register file source
      await fetch(`${this.baseUrl}/api/chat/sources`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ file_name: filename })
      });
    }

    const payload = {
      message: { content: message },
      provider: model,
      chat_mode: 'auto',
      client_version: '20240130',
      theme: 'light',
      dataframe_format: 'json',
      new_attachments: newAttachments,
      selectedModels: null
    };
    if (advancedReasoning) payload.advanced_reasoning = true;

    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Message send failed: ${response.statusText}`);

    // Handle streaming response (simplified; in practice, process chunks)
    const reader = response.body.getReader();
    let content = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = new TextDecoder().decode(value);
      // Parse JSON chunks (simplified; handle multiple objects)
      try {
        const data = JSON.parse(chunk);
        if (data.content) content += data.content;
      } catch (e) {
        // Handle parsing errors
      }
    }
    return content;
  }

  async chatCompletion(messages, model = 'default') {
    const conversationId = await this.startConversation(model);
    let fullContent = '';
    for (const msg of messages) {
      if (msg.role === 'user') {
        const content = await this.sendMessage(conversationId, msg.content, msg.file_paths || [], model, msg.advanced_reasoning);
        fullContent += content;
      }
    }
    return { message: { content: fullContent } };
  }
}

export default JuliusAPI;