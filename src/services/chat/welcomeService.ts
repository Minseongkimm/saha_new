// Welcome 메시지는 간단한 프리셋 사용
import { welcomeMessages } from './welcomeMessages';

class WelcomeService {
  private static instance: WelcomeService;

  private constructor() {
    // 생성자 비움
  }

  public static getInstance(): WelcomeService {
    if (!WelcomeService.instance) {
      WelcomeService.instance = new WelcomeService();
    }
    return WelcomeService.instance;
  }


  public async generateWelcomeMessage(
    expertName: string,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    const messages = welcomeMessages;
    const defaultMessage = "고민, 걱정, 불안, 사주 무엇이든 편하게 물어보세요.";
    const message = messages[expertName] || defaultMessage;
    
    // 스트리밍 효과가 필요한 경우
    if (onStream) {
      const chunkSize = 1; // 1글자씩
      const delay = 50; // 50ms 간격
      
      for (let i = 0; i < message.length; i += chunkSize) {
        const chunk = message.slice(i, i + chunkSize);
        onStream(chunk);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return message;
  }

}

export const welcomeService = WelcomeService.getInstance();
