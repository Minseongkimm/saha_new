export const getExpertImage = (imageName: string) => {
  const images: { [key: string]: any } = {
    'hoosi_guy.jpg': require('../../assets/people/hoosi_guy.jpg'),
    'yeonhwa_girl.jpg': require('../../assets/people/yeonhwa_girl.jpg'),
    'cheongwang_guy.jpg': require('../../assets/people/cheongwang_guy.jpg'),
    'sangtong_guy.jpg': require('../../assets/people/sangtong_guy.jpg'),
    'traditional_saju_expert.jpg': require('../../assets/people/cheongwang_guy.jpg'), // 전통사주 전문가용 이미지
  };
  return images[imageName];
};
