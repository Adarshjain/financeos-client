export interface CategoryRequest {
  name: string;
}

export type Category = CategoryRequest & {
  id: string;
};

export interface CategorizeResponse {
  categories: Category[];
  ruleId: string | null;
  fromRule: boolean;
  mcc?: string | null;
}