export interface Expert {
  id: string;
  name: string;
  category: 'residence' | 'love' | 'life' | 'wealth' | 'traditional_saju';
  title: string;
  description: string;
  image_name: string;
  is_online: boolean;
  created_at: string;
}
