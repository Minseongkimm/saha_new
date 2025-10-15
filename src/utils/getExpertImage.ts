export const getExpertImage = (imageName: string) => {
  const images: { [key: string]: any } = {
    // 기존 도사님들
    'hoosi_guy.jpg': require('../../assets/people/hoosi_guy.jpg'),
    'yeonhwa_girl.jpg': require('../../assets/people/yeonhwa_girl.jpg'),
    'cheongwang_guy.jpg': require('../../assets/people/cheongwang_guy.jpg'),
    'sangtong_guy.jpg': require('../../assets/people/sangtong_guy.jpg'),
    
    // 새로운 6명의 도사님들
    'yeonjeong_dosa.jpg': require('../../assets/people/yeonhwa_girl.jpg'), // 연정도사 - 연애 전문
    'hyeonun_dosa.jpg': require('../../assets/people/sangtong_guy.jpg'), // 현운도사 - 재물/직업 전문
    'myeongyeon_dosa.jpg': require('../../assets/people/cheongwang_guy.jpg'), // 명연도사 - 인생방향 전문
    'dodam_dosa.jpg': require('../../assets/people/hoosi_guy.jpg'), // 도담도사 - 가족 전문
    'unmyeong_dosa.jpg': require('../../assets/people/cheongwang_guy.jpg'), // 운명도사 - 시기/변화 전문
    'cheongmyeong_dosa.jpg': require('../../assets/people/hoosi_guy.jpg'), // 청명도사 - 마음/불안 전문
  };
  return images[imageName];
};
