import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('User does not exist');
    }

    const productsById = await this.productsRepository.findAllById(products);
    const updateProductsQuantity: IProduct[] = [];

    const orderProducts = products.map(product => {
      const storedProduct = productsById.find(item => item.id === product.id);

      if (!storedProduct) {
        throw new AppError(`Product with id ${product.id} does not exist`);
      } else if (storedProduct.quantity < product.quantity) {
        throw new AppError('There is not enough quantity for this product');
      }

      updateProductsQuantity.push({
        id: storedProduct.id,
        quantity: storedProduct.quantity - product.quantity,
      });
      return {
        product_id: storedProduct.id,
        price: storedProduct.price,
        quantity: product.quantity,
      };
    });

    await this.productsRepository.updateQuantity(updateProductsQuantity);
    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
