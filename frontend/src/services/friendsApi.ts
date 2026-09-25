import { apiClient } from './apiClient';

export interface FriendSearchResult {
  id: string;
  username: string;
}

export interface Friend {
  id: string;
  username: string;
  online: boolean;
}

export interface FriendRequestSummary {
  id: string;
  createdAt: string;
}

export interface IncomingRequest extends FriendRequestSummary {
  senderId: string;
  senderUsername: string;
}

export interface OutgoingRequest extends FriendRequestSummary {
  receiverId: string;
  receiverUsername: string;
}

export interface FriendRequestsList {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
}

export const friendsApi = {
  search: (query: string) =>
    apiClient.get<FriendSearchResult[]>(`/api/friends/search?query=${encodeURIComponent(query)}`),
  sendRequest: (receiverId: string) => apiClient.post<{ id: string; status: string }>('/api/friends/requests', { receiverId }),
  listRequests: () => apiClient.get<FriendRequestsList>('/api/friends/requests'),
  accept: (requestId: string) =>
    apiClient.post<{ id: string; status: string }>(`/api/friends/requests/${requestId}/accept`),
  reject: (requestId: string) =>
    apiClient.post<{ id: string; status: string }>(`/api/friends/requests/${requestId}/reject`),
  cancelRequest: (requestId: string) => apiClient.delete<void>(`/api/friends/requests/${requestId}`),
  listFriends: () => apiClient.get<Friend[]>('/api/friends'),
  removeFriend: (userId: string) => apiClient.delete<void>(`/api/friends/${userId}`)
};
