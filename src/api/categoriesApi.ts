import { httpClient, unwrapData } from '../lib/httpClient'
import type { Category, CategoryType } from '../types/flowra'

export interface CategoryListData {
  items: Category[]
}

export interface CreateCategoryPayload {
  name: string
  color: string
  type: CategoryType
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

export const categoriesApi = {
  list: (type?: CategoryType) =>
    unwrapData<CategoryListData>(
      httpClient.get('/categories', {
        params: type ? { type } : undefined,
      }),
    ),

  create: (payload: CreateCategoryPayload) =>
    unwrapData<Category>(httpClient.post('/categories', payload)),

  update: (categoryId: number, payload: UpdateCategoryPayload) =>
    unwrapData<Category>(httpClient.patch(`/categories/${categoryId}`, payload)),

  remove: (categoryId: number) =>
    unwrapData<null>(httpClient.delete(`/categories/${categoryId}`)),
}
