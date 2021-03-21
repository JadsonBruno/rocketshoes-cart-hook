import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {toast} from 'react-toastify';
import {api} from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // alternative solution
  // useEffect(() =>
  // {
  //   const cartToLocal = JSON.stringify(cart);
  //   localStorage.setItem('@RocketShoes:cart', cartToLocal);
  // }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const selectedProduct = cart.find((product) => product.id === productId);

      if (selectedProduct !== undefined) {
        const {data} = await api.get<Stock>(`stock/${productId}`);
        
        const total = selectedProduct.amount + 1;
    
        if (total > data.amount) {
          toast.error('Quantidade solicitada fora de estoque');
    
          return;
        }
    
        const newCart = cart.map((item) => item.id === productId? ({
          ...item,
          amount: total,
        }) : item);
    
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    
        setCart(newCart);
    
        return;
      }
    
      const {data} = await api.get<Product>(`products/${productId}`);
        
      setCart(oldCart => {
        const newCart = [...oldCart, {...data, amount: 1}];
    
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    
        return newCart;
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.findIndex(product => product.id === productId) === -1)
      {
        throw new Error();
      }

      setCart(prevState => {
        const newCart = prevState.filter(product => product.id !== productId);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      if (amount <= stockResponse.data.amount) {
        const newCart = cart.map((product) =>
          product.id === productId ? { ...product, amount } : { ...product }
        );

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        setCart(newCart);
      }
      else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
