export interface Person {
  id: string;
  name: string;
  role: string;
  team: string;
  age: number;
  avatar: string; // initials or emoji
  isMe?: boolean;
}

export const people: Person[] = [
  {
    id: 'me',
    name: '고연구원',
    role: '선임 연구원',
    team: '개발팀',
    age: 32,
    avatar: '고',
    isMe: true,
  },
  {
    id: 'choi-lead',
    name: '최팀장',
    role: '개발팀장',
    team: '개발팀',
    age: 38,
    avatar: '최',
  },
  {
    id: 'park-pm',
    name: '박매니저',
    role: 'PM',
    team: '기획팀',
    age: 35,
    avatar: '박',
  },
  {
    id: 'kim-jiwon',
    name: '김지원',
    role: '프론트엔드 개발자',
    team: '개발팀',
    age: 29,
    avatar: '김',
  },
  {
    id: 'lee-sujeong',
    name: '이수정',
    role: '백엔드 개발자',
    team: '개발팀',
    age: 31,
    avatar: '이',
  },
  {
    id: 'park-minsu',
    name: '박민수',
    role: 'QA 엔지니어',
    team: 'QA팀',
    age: 30,
    avatar: '박',
  },
  {
    id: 'jung-yeongu',
    name: '정연구',
    role: '데이터 엔지니어',
    team: '데이터팀',
    age: 33,
    avatar: '정',
  },
  {
    id: 'yoon-ceo',
    name: '윤대표',
    role: '대표이사',
    team: '협력사',
    age: 47,
    avatar: '윤',
  },
];

export const getPerson = (id: string) => people.find(p => p.id === id);
export const getMe = () => people.find(p => p.isMe)!;
