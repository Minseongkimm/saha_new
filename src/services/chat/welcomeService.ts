// Welcome 메시지는 간단한 프리셋 사용
import { welcomeMessages, welcomeMessagesMindfulness } from './welcomeMessages';
import { shouldUseMindfulnessTerms } from '../../utils/config/appConfig';

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
    const useMindfulnessTerms = await shouldUseMindfulnessTerms();
    const messages = useMindfulnessTerms ? welcomeMessagesMindfulness : welcomeMessages;
    
    // mindfulness 모드일 때는 이름 매핑 필요 (도사/낭자 제거된 이름)
    let lookupName = expertName;
    if (useMindfulnessTerms) {
      // 이름에서 도사/낭자 제거 (궁합 전용은 그대로 유지)
      lookupName = expertName.replace(/도사|낭자/g, '').trim();
    }
    
    const defaultMessage = useMindfulnessTerms 
      ? "안녕하세요! 상담을 시작합니다."
      : "안녕하세요! 사주 상담을 시작합니다.";
    
    const message = messages[lookupName] || messages[expertName] || defaultMessage;
    
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
