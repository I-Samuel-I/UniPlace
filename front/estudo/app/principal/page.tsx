// app/products/page.tsx (ou o caminho da sua página)
import React from 'react';
import styles from './principal.module.css';
import Link from 'next/link';

// 1. Definimos a interface (tipagem) do Produto
interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
}

// Ícones SVG Inline
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const MailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Lista de produtos tipada
const productsData: Product[] = [
  { id: 1, title: 'Notebook Positivo / CCE', description: 'Usado em bom estado geral', price: '1.299,99', imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&auto=format&fit=crop&q=60' },
  { id: 2, title: 'Smartphone Android', description: 'Aparelho funcionando perfeitamente', price: '850,00', imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&auto=format&fit=crop&q=60' },
  { id: 3, title: 'Capinha e Película Galaxy', description: 'Acessórios novos na caixa', price: '45,00', imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&auto=format&fit=crop&q=60' },
  { id: 4, title: 'Power Bank 10.000mAh', description: 'Carregador portátil rápido', price: '120,00', imageUrl: 'https://images.unsplash.com/photo-1609592806135-eed7505786ab?w=400&auto=format&fit=crop&q=60' },
  { id: 5, title: 'Memória RAM 8GB DDR4', description: 'Para notebook ou PC gamer', price: '160,00', imageUrl: 'https://images.unsplash.com/photo-1562976540-1e02c5144c9b?w=400&auto=format&fit=crop&q=60' },
  { id: 6, title: 'Smartphone Tela Trincada', description: 'Ideal para retirada de peças', price: '300,00', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=60' },
  { id: 7, title: 'iPhone SE / 8', description: 'Com caixa e acessórios originais', price: '950,00', imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&auto=format&fit=crop&q=60' },
  { id: 8, title: 'iPhone Preto Premium', description: 'Excelente estado de bateria', price: '2.100,00', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&auto=format&fit=crop&q=60' },
  { id: 9, title: 'Livros de Romance / Suspense', description: 'Kit com 2 livros seminovos', price: '60,00', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=60' },
  { id: 10, title: 'Carregador Tipo-C Turbo', description: 'Fonte + Cabo de alta velocidade', price: '75,00', imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=60' },
  { id: 11, title: 'Netbook Antigo', description: 'Necessita troca de bateria', price: '250,00', imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&auto=format&fit=crop&q=60' },
  { id: 12, title: 'Smartphone Motorola', description: 'Modelo intermediário completo', price: '700,00', imageUrl: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&auto=format&fit=crop&q=60' },
  { id: 13, title: 'Controle Joystick Bluetooth', description: 'Compatível com celular e PC', price: '110,00', imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=400&auto=format&fit=crop&q=60' },
  { id: 14, title: 'Processador Intel Core i5', description: 'Testado e funcionando 100%', price: '220,00', imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&auto=format&fit=crop&q=60' },
  { id: 15, title: 'Película de Vidro 3D', description: 'Vários modelos disponíveis', price: '20,00', imageUrl: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&auto=format&fit=crop&q=60' }
];

// 2. Componente de Card recebendo a propriedade tipada
interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        <img
          src={product.imageUrl}
          alt={product.title}
          className={styles.productImage}
        />
        <div className={styles.sellerBadge} title="Perfil do Vendedor">
          <UserIcon />
        </div>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.productTitle}>{product.title}</h3>
        <p className={styles.productDescription}>{product.description}</p>
        <div className={styles.productPrice}>
          <span className={styles.priceSymbol}>R$</span>
          {product.price}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <div className={styles.container}>
      {/* Menu Lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>U</div>
          <nav className={styles.navIcons}>
            <button className={styles.iconButton} aria-label="Home">
              <HomeIcon />
            </button>
            <button className={styles.iconButton} aria-label="Mensagens">
              <MailIcon />
            </button>
            <button className={styles.iconButton} aria-label="Perfil">
              <UserIcon />
            </button>
          </nav>
        </div>
        <button className={styles.iconButton} aria-label="Configurações">
          <SettingsIcon />
        </button>
      </aside>

      {/* Área Principal */}
      <div className={styles.mainContent}>
        {/* Topbar / Header */}
        <header className={styles.header}>
          <div className={styles.searchContainer}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Pesquisar..."
              className={styles.searchInput}
            />
          </div>
          <Link href={"/login"}>
            <button className={styles.authButton}>Login/Cadastrar</button>
          </Link>
          
        </header>

        {/* Galeria de Produtos */}
        <main className={styles.content}>
          <div className={styles.grid}>
            {productsData.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}