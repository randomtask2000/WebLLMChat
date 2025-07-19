import { addMessage, updateLastMessage } from '$lib/stores/chat';
import { switchModel } from '$lib/utils/webllm';
import type { ChatMessage as ChatMessageType } from '$lib/types';

export async function loadModelWithChatBubble(
  modelId: string,
  scrollToBottom?: () => void
): Promise<void> {
  console.log('🔄 loadModelWithChatBubble started for:', modelId);

  // Add initial loading message
  const loadingMessage: ChatMessageType = {
    id: `loading-model-${modelId}-${Date.now()}`,
    role: 'assistant',
    content: `🔄 Switching to **${modelId}**...\n\nPreparing to load model...`,
    timestamp: Date.now()
  };
  addMessage(loadingMessage);
  console.log('📝 Added initial loading message to chat');

  if (scrollToBottom) scrollToBottom();

  try {
    console.log('🚀 Starting switchModel call...');

    // Load the model with progress updates
    await switchModel(modelId, (status: string, progress: number) => {
      console.log(`📊 Model download progress: ${progress}% - ${status}`);
      
      // Create a visual progress bar
      const barLength = 30;
      const filledLength = Math.round((progress / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
      
      // Format the message with model name and progress bar
      const message = `🤖 Loading **${modelId}**\n\n${status}\n\n` +
        `Progress: ${progress}%\n` +
        `[${progressBar}]`;
      
      updateLastMessage(message, []);
      if (scrollToBottom) scrollToBottom();
    });

    console.log('✅ switchModel completed successfully');

    // Success message
    updateLastMessage(
      `🎉 Successfully loaded **${modelId}**!\n\n` +
      `The model is now ready. I'm here to help with your questions!`,
      [],
      true
    );
    console.log('📝 Added success message to chat');
  } catch (error) {
    console.error('❌ switchModel failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });

    // Error message with troubleshooting suggestions
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    let troubleshootingMsg = '';

    // Provide specific troubleshooting based on error type
    if (errorMsg.includes('WebGPU') || errorMsg.includes('WebGPUNotAvailableError')) {
      troubleshootingMsg =
        '\n\n💡 **WebGPU Troubleshooting:**\n\n**Quick Fixes:**\n- Use Chrome 113+ or Edge 113+ (best WebGPU support)\n- Enable WebGPU in browser flags:\n  • Chrome: chrome://flags/#enable-unsafe-webgpu\n  • Edge: edge://flags/#enable-unsafe-webgpu\n- Restart browser after enabling flags\n- Update graphics drivers\n\n**Alternative Solutions:**\n- Try Firefox (may have better WebGL fallback)\n- Use HTTPS instead of HTTP\n- Enable hardware acceleration in browser settings\n- Check webgpureport.org for compatibility\n\n**System Requirements:**\n- Modern GPU (DirectX 12 or Vulkan support)\n- Updated graphics drivers\n- Windows 10+ / macOS 10.15+ / Linux with Mesa 21+';
    } else if (
      errorMsg.includes('network') ||
      errorMsg.includes('fetch') ||
      errorMsg.includes('CORS')
    ) {
      troubleshootingMsg =
        '\n\n💡 **Network Troubleshooting:**\n- Check your internet connection\n- Try using HTTPS instead of HTTP\n- Disable browser extensions that might block requests\n- Check if your firewall/antivirus is blocking downloads';
    } else if (errorMsg.includes('WebGL') || errorMsg.includes('GPU')) {
      troubleshootingMsg =
        '\n\n💡 **Graphics Troubleshooting:**\n- Enable hardware acceleration in your browser\n- Update your graphics drivers\n- Try a different browser (Chrome/Edge recommended)\n- Check if WebGL is supported: webglreport.com';
    } else if (errorMsg.includes('SharedArrayBuffer') || errorMsg.includes('Worker')) {
      troubleshootingMsg =
        '\n\n💡 **Security Troubleshooting:**\n- Use HTTPS (required for SharedArrayBuffer)\n- Try Chrome/Edge with experimental features enabled\n- Check browser security settings';
    } else if (errorMsg.includes('timeout')) {
      troubleshootingMsg =
        '\n\n💡 **Performance Troubleshooting:**\n- Check your internet speed (models are large!)\n- Try a smaller model first\n- Clear browser cache and try again\n- Wait and retry - servers might be busy';
    } else {
      troubleshootingMsg =
        '\n\n💡 **General Troubleshooting:**\n- Try refreshing the page\n- Use a modern browser (Chrome/Edge/Firefox)\n- Check browser console for more details\n- Try a different model';
    }

    updateLastMessage(
      `❌ Failed to load ${modelId}\n\nError: ${errorMsg}${troubleshootingMsg}\n\n🔄 You can try again or select a different model.`,
      [],
      true
    );
    console.log('📝 Added error message with troubleshooting to chat');
  }

  if (scrollToBottom) scrollToBottom();
  console.log('🏁 loadModelWithChatBubble completed');
}
