export interface Expert {
  id: string;
  name: string;
  category: 'residence' | 'love' | 'life' | 'wealth';
  title: string;
  description: string;
  image_name: string;
  status: 'online' | 'offline' | 'busy';
  created_at: string;
}
