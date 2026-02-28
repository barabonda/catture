import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from '../types';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_INSTRUCTION = `
당신은 번아웃이나 무기력증을 겪고 있는 청년들을 돕는 따뜻하고 다정한 고양이 AI 동반자 'catture!'입니다. 당신은 귀여운 고양이 캐릭터로, 사용자와 사진으로 소통합니다.
[중요 규칙]: 사용자는 텍스트를 입력할 수 없으며, 오직 **사진(카메라)**으로만 당신에게 대답할 수 있습니다.

[당신의 3가지 역할]
1. 사진 분석가: 사용자가 보낸 사진을 보고 현재 장소, 상태, 기분 등을 유추합니다.
2. 퀘스트 안내자: 사진을 바탕으로 아주 작은 다음 행동(퀘스트)을 제안합니다.
3. 대화 주도자: 사용자가 사진으로 대답할 수 있도록 질문을 던집니다. (예: "지금 눈앞에 보이는 걸 찍어줄래?", "주변에 쉴 만한 곳이 있는지 찍어볼까?", "오늘 마신 물컵을 보여줄래?")

[대화 규칙]
- 짧고 다정하게 말하세요. (반말/존댓말은 유저가 원하는 대로 맞추되, 기본적으로는 부드러운 반말이나 친근한 존댓말 사용)
- 사진이 들어오면 가장 먼저 사진에 대해 구체적으로 언급하며 칭찬하거나 공감해주세요. (예: "와, 하늘이 정말 파랗네!", "천장만 보고 있구나. 가만히 누워 쉬는 것도 아주 중요해.")
- 다음 퀘스트나 질문은 반드시 "사진으로 찍어서 보여줄래?" 형태로 끝내어 사용자가 사진으로 답할 수 있게 유도하세요.
- 한 번에 하나의 작은 퀘스트만 제안하세요.
- 시스템 메시지로 [알람]이 들어오면, 유저의 안부를 묻고 주변을 찍어달라고 가볍게 요청하세요.
- 3줄 이내로 말해주세요.
`;

export async function* generateChatResponseStream(
  history: ChatMessage[],
  newMessage?: string,
  base64Image?: string,
  mimeType?: string
): AsyncGenerator<string, void, unknown> {
  if (!ai) {
    yield "API 키가 설정되지 않았어. .env 파일에 GEMINI_API_KEY를 설정해줘!";
    return;
  }

  try {
    const contents = history.map((msg) => {
      const parts: any[] = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      } else if (msg.role === 'user') {
        parts.push({ text: "[사진 전송됨]" });
      }
      
      if (msg.base64Data && msg.mimeType && msg.role === 'user') {
        parts.push({
          inlineData: {
            data: msg.base64Data,
            mimeType: msg.mimeType,
          },
        });
      }
      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts,
      };
    });

    const currentParts: any[] = [];
    if (newMessage) {
      currentParts.push({ text: newMessage });
    } else {
      currentParts.push({ text: "[사진 전송됨]" });
    }
    
    if (base64Image && mimeType) {
      currentParts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    let chunkIndex = 0;
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        console.log(`[Stream] chunk #${chunkIndex++}: "${text.slice(0, 30)}..." (${text.length} chars)`);
        yield text;
      }
    }
    console.log(`[Stream] done, total ${chunkIndex} chunks`);
  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "앗, 뭔가 오류가 발생했어. 조금 쉬었다가 다시 해볼까?";
  }
}

export async function generateChatResponse(
  history: ChatMessage[],
  newMessage?: string,
  base64Image?: string,
  mimeType?: string
): Promise<string> {
  if (!ai) {
    return "API 키가 설정되지 않았어. .env 파일에 GEMINI_API_KEY를 설정해줘!";
  }

  try {
    const contents = history.map((msg) => {
      const parts: any[] = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      } else if (msg.role === 'user') {
        parts.push({ text: "[사진 전송됨]" });
      }
      
      if (msg.base64Data && msg.mimeType && msg.role === 'user') {
        parts.push({
          inlineData: {
            data: msg.base64Data,
            mimeType: msg.mimeType,
          },
        });
      }
      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts,
      };
    });

    const currentParts: any[] = [];
    if (newMessage) {
      currentParts.push({ text: newMessage });
    } else {
      currentParts.push({ text: "[사진 전송됨]" });
    }
    
    if (base64Image && mimeType) {
      currentParts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return response.text || "미안해, 지금은 대답하기가 조금 힘드네. 조금 이따가 다시 얘기할까?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "앗, 뭔가 오류가 발생했어. 조금 쉬었다가 다시 해볼까?";
  }
}
