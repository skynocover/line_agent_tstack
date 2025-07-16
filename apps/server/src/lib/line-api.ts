import axios from 'axios';

interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineGroupSummary {
  groupId: string;
  groupName: string;
  pictureUrl?: string;
}

/**
 * LINE API 服務類別
 */
export class LineApiService {
  private accessToken: string;
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 獲取用戶資料
   */
  async getUserProfile(userId: string): Promise<LineUserProfile | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
      }
      return null;
    }
  }

  /**
   * 獲取群組資料
   */
  async getGroupSummary(groupId: string): Promise<LineGroupSummary | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/group/${groupId}/summary`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get group summary:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
      }
      return null;
    }
  }

  /**
   * 獲取房間資料（類似群組）
   */
  async getRoomSummary(roomId: string): Promise<LineGroupSummary | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/room/${roomId}/summary`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get room summary:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
      }
      return null;
    }
  }

  /**
   * 獲取顯示名稱 - 統一的介面
   */
  async getDisplayName(id: string, type: 'user' | 'group' | 'room'): Promise<string> {
    try {
      switch (type) {
        case 'user': {
          const profile = await this.getUserProfile(id);
          return profile?.displayName || `用戶 ${id}`;
        }
        case 'group': {
          const summary = await this.getGroupSummary(id);
          return summary?.groupName || `群組 ${id}`;
        }
        case 'room': {
          const summary = await this.getRoomSummary(id);
          return summary?.groupName || `房間 ${id}`;
        }
        default:
          return id;
      }
    } catch (error) {
      console.error(`Failed to get display name for ${type} ${id}:`, error);
      return id;
    }
  }
}

/**
 * 建立 LINE API 服務實例
 */
export function createLineApiService(accessToken: string): LineApiService {
  return new LineApiService(accessToken);
}
