export interface CategoryRequest {
  name: string;
}

export type Category = CategoryRequest & {
  id: string;
};