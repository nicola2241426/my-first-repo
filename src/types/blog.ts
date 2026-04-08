export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  createdAt: string;
  category: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  count: number;
}
