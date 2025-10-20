export const getExpertImage = (imageName: string) => {
  const images: { [key: string]: any } = {
    // 현재 사용 중인 도사님들
    'hoshi.jpg': require('../../assets/people/hoshi.jpg'),
    'yeonhwa.jpg': require('../../assets/people/yeonhwa.jpg'),
    'sangtong.jpg': require('../../assets/people/sangtong.jpg'),
    'jangsaeng.jpg': require('../../assets/people/jangsaeng.jpg'),
    'healing.jpg': require('../../assets/people/healing.jpg'),
    'success.jpg': require('../../assets/people/success.jpg'),
    'career.jpg': require('../../assets/people/career.jpg'),
    'tongchal.jpg': require('../../assets/people/tongchal.jpg'),
    'cheongwang.jpg': require('../../assets/people/cheongwang.jpg'),
    'sangpyeong.jpg': require('../../assets/people/sangpyeong.jpg'),
  };
  return images[imageName];
};
