"""Fictional marketplace scenarios; loaded only by the explicit demo command."""

from dataclasses import dataclass, field

DEMO_PASSWORD = "UniPlaceDemo#2026"
DEMO_USERS = [
    ("Ana Carolina", "demo.ana@medicina.fiponline.edu.br", "#b86950"),
    ("Lucas Almeida", "demo.lucas@ads.fiponline.edu.br", "#4874a4"),
    ("Camila Santos", "demo.camila@direito.fiponline.edu.br", "#9466a3"),
    ("Matheus Ferreira", "demo.matheus@engenharia.fiponline.edu.br", "#4e8075"),
    ("Juliana Costa", "demo.juliana@enfermagem.fiponline.edu.br", "#ad6580"),
    ("Gabriel Rocha", "demo.gabriel@ads.fiponline.edu.br", "#617eae"),
    ("Beatriz Lima", "demo.beatriz@psicologia.fiponline.edu.br", "#a46f49"),
    ("Pedro Henrique", "demo.pedro@educacaofisica.fiponline.edu.br", "#57866c"),
    ("Mariana Alves", "demo.mariana@fisioterapia.fiponline.edu.br", "#9a6890"),
    ("Rafael Mendes", "demo.rafael@ads.fiponline.edu.br", "#567593"),
    ("Larissa Sousa", "demo.larissa@odontologia.fiponline.edu.br", "#b87953"),
    ("Bruno Carvalho", "demo.bruno@administracao.fiponline.edu.br", "#73834d"),
]


@dataclass(frozen=True)
class DemoPost:
    key: str
    title: str
    category: str
    price: str
    photo: str
    seller: int | None
    description: str
    condition: str = "like_new"
    status: str = "active"
    kind: str = "product"
    featured: bool = False
    trade: bool = False
    negotiable: bool = True
    gallery: tuple[str, ...] = ()
    attributes: dict[str, str] = field(default_factory=dict)


DEMO_POSTS = [
    DemoPost("macbook", "MacBook Air M1 · 8 GB / 256 GB", "notebooks", "3800.00", "macbook-air-open.jpg", 1,
             "Notebook usado apenas na faculdade. Acompanha carregador, caixa e capa. Bateria com boa autonomia; podemos testar juntos na biblioteca.",
             featured=True, gallery=("macbook-air-keyboard.jpg", "macbook-air-ports.jpg", "macbook-air-desk.jpg"),
             attributes={"Marca": "Apple", "Memória RAM": "8 GB", "Armazenamento": "SSD 256 GB", "Processador": "Apple M1"}),
    DemoPost("iphone", "iPhone 13 128 GB com carregador", "celulares", "2450.00", "iphone.jpg", 2,
             "Celular muito bem cuidado, sem trincos e com todas as funções funcionando. Acompanha cabo e capinha. Estou vendendo porque troquei de aparelho.", featured=True,
             attributes={"Marca": "Apple", "Armazenamento": "128 GB", "Cor": "Azul"}),
    DemoPost("guyton", "Guyton e Hall · Tratado de Fisiologia Médica", "livros-universitarios", "180.00", "livro.jpg", 0,
             "Livro de fisiologia usado no ciclo básico. Páginas conservadas, com alguns grifos a lápis. Ótimo para quem está começando Medicina.", condition="used", featured=True,
             attributes={"Área": "Medicina", "Idioma": "Português"}),
    DemoPost("cadeira", "Cadeira de escritório com apoio lombar", "moveis", "390.00", "cadeira.jpg", 3,
             "Cadeira confortável para estudar, com regulagem de altura e rodinhas funcionando. Posso ajudar no transporte até a entrada principal.", featured=True),
    DemoPost("ipad", "iPad 9ª geração 64 GB com capa", "tablets", "1650.00", "ipad.jpg", 4,
             "Usei para fazer resumos e acompanhar as aulas. Tela sem riscos, bateria boa e capa inclusa. Disponível para testar no campus.", featured=True,
             attributes={"Marca": "Apple", "Armazenamento": "64 GB", "Conectividade": "Wi-Fi"}),
    DemoPost("monitor", "Monitor 24 polegadas Full HD", "monitores", "520.00", "monitor.jpg", 5,
             "Ideal como segunda tela para programação e trabalhos. Acompanha cabo HDMI e fonte. Testo na hora da retirada.",
             attributes={"Tela": "24 polegadas", "Resolução": "1920 × 1080", "Conexão": "HDMI"}),
    DemoPost("controle", "Controle DualSense para PS5", "games", "280.00", "controle.jpg", 7,
             "Controle original com pouco uso. Analógicos sem drift e bateria funcionando. Aceito trocar por jogos físicos.", trade=True,
             attributes={"Marca": "Sony", "Compatibilidade": "PS5 e PC"}),
    DemoPost("mochila", "Mochila para notebook e material da faculdade", "mochilas", "95.00", "mochila.jpg", 6,
             "Mochila resistente, com compartimento acolchoado para notebook. Zíperes funcionando e interior limpo.", condition="used"),
    DemoPost("beleza", "Kit de cuidados pessoais lacrado", "beleza", "75.00", "beleza.jpg", 8,
             "Kit novo que recebi de presente. Embalagens fechadas; entrego na biblioteca ou na entrada do campus.", condition="new", negotiable=False),
    DemoPost("camiseta", "Camiseta branca de algodão · tamanho M", "roupas", "35.00", "camiseta.jpg", 10,
             "Camiseta básica sem estampas, usada poucas vezes. Tecido macio e sem manchas. Entrego durante o intervalo.", attributes={"Tamanho": "M", "Material": "Algodão", "Cor": "Branca"}),
    DemoPost("tenis", "Tênis Nike vermelho · número 40", "calcados", "160.00", "tenis.jpg", 11,
             "Tênis leve para o dia a dia e caminhadas. Higienizado e com solado conservado. Pode experimentar antes de fechar.", condition="used", attributes={"Marca": "Nike", "Número": "40"}),
    DemoPost("halteres", "Par de halteres para treinar em casa", "esportes", "90.00", "halteres.jpg", 9,
             "Par de halteres em bom estado para exercícios em casa. Vendo porque passei a treinar na academia do bairro.", condition="used"),
    DemoPost("acer", "Notebook Acer Aspire 5 · i5 / 8 GB", "notebooks", "2200.00", "notebook.jpg", 1,
             "Notebook para estudos, programação e trabalhos. SSD deixa o sistema rápido. Acompanha carregador e mochila simples.", trade=True,
             attributes={"Marca": "Acer", "Processador": "Intel Core i5", "Memória RAM": "8 GB", "Armazenamento": "SSD 512 GB"}),
    DemoPost("cafeteira", "Cafeteira automática para a república", "eletrodomesticos", "320.00", "cafeteira.jpg", 2,
             "Cafeteira funcionando e revisada. Ideal para dividir com os colegas. Combino retirada na saída da aula.", condition="used", attributes={"Voltagem": "220 V"}),
    DemoPost("anatomia", "Atlas de anatomia para o primeiro período", "livros-universitarios", "120.00", "livro.jpg", 0,
             "Material que me ajudou bastante nas aulas práticas. Possui pequenas marcas de uso na capa; conteúdo completo.", condition="used"),
    DemoPost("tablet-resumos", "Tablet para estudar e fazer resumos", "tablets", "980.00", "ipad.jpg", 4,
             "Tablet conservado para leitura de PDFs, aulas e anotações. Acompanha capa protetora. Aceito proposta à vista."),
    DemoPost("monitor-estudos", "Monitor para montar seu cantinho de estudos", "monitores", "410.00", "monitor.jpg", 9,
             "Monitor sem pixels mortos, com imagem boa e suporte original. Posso mostrar funcionando antes da entrega.", condition="used"),
    DemoPost("airpods", "Fones sem fio com estojo de recarga", "fones-de-ouvido", "240.00", "airpods.jpg", 6,
             "Fones usados nas aulas online. Microfone e carregamento funcionando. Entrego higienizados e com cabo."),
    DemoPost("camiseta-g", "Camiseta básica branca · tamanho G", "roupas", "30.00", "camiseta.jpg", 10,
             "Camiseta confortável para as aulas. Modelo unissex, sem manchas e sem furos. Posso levar para você conferir o tamanho.", attributes={"Tamanho": "G", "Cor": "Branca"}),
    DemoPost("tenis-38", "Tênis para caminhada · número 38", "calcados", "125.00", "tenis.jpg", 11,
             "Tênis usado em caminhadas leves. Está limpo e pronto para uso. Vendo para liberar espaço no armário.", condition="used", attributes={"Número": "38"}),
    DemoPost("halteres-treino", "Halteres para treino funcional", "esportes", "110.00", "halteres.jpg", 7,
             "Equipamento para exercícios de força e treino funcional. Aceito troca por materiais esportivos.", trade=True),
    DemoPost("cadeira-estudos", "Cadeira para mesa de estudos", "moveis", "250.00", "cadeira.jpg", 3,
             "Boa para quem está montando uma república. Estrutura firme e assento conservado. Retirada combinada no campus.", condition="used"),
    DemoPost("mochila-aulas", "Mochila de uso diário com vários bolsos", "mochilas", "65.00", "mochila.jpg", 8,
             "Cabe material, garrafa e notebook pequeno. Possui marcas de uso, mas todos os bolsos e zíperes funcionam.", condition="used"),
    DemoPost("controle-extra", "Controle para jogar no PC e PS5", "games", "310.00", "controle.jpg", 5,
             "Controle extra que quase não usei. Vai com cabo USB-C. Aceito proposta e posso entregar depois da aula."),
    DemoPost("kit-novo", "Kit de autocuidado novo para presente", "beleza", "85.00", "beleza.jpg", 10,
             "Embalagens novas e fechadas. Ganhei dois kits iguais e estou passando um adiante.", condition="new"),
    DemoPost("cafeteira-republica", "Cafeteira para cozinha compartilhada", "eletrodomesticos", "280.00", "cafeteira.jpg", 11,
             "Usada em nossa república, sempre limpa depois do uso. Está funcionando; podemos testar antes de fechar.", condition="used"),
    DemoPost("apostilas", "Apostilas de revisão de fisiologia", "apostilas", "40.00", "livro.jpg", 0,
             "Conjunto de apostilas impressas com exercícios resolvidos e resumos do semestre. Material para complementar os estudos.", condition="used"),
    DemoPost("macbook-estudos", "MacBook Air para faculdade · com carregador", "notebooks", "3500.00", "macbook-air-desk.jpg", 3,
             "Notebook muito bem cuidado, usado em trabalhos da faculdade. Acompanha carregador e podemos marcar um encontro para testar com calma.",
             gallery=("macbook-air-open.jpg", "macbook-air-keyboard.jpg"), attributes={"Marca": "Apple", "Memória RAM": "8 GB"}),
    DemoPost("doacao-livros", "Doação de livros e materiais do ciclo básico", "livros", "0.00", "livro.jpg", 0,
             "Quero doar alguns materiais para quem está começando. Basta combinar a retirada; não cobro pelos livros.", condition="used", negotiable=False),
    DemoPost("monitoria", "Monitoria de lógica de programação · por hora", "eletronicos", "45.00", "notebook.jpg", 5,
             "Ajudo com lógica, Python e exercícios introdutórios. Podemos estudar na biblioteca em um horário livre entre as aulas.", kind="service", condition="", attributes={"Modalidade": "Presencial no campus", "Duração": "1 hora"}),
    DemoPost("iphone-vendido", "iPhone 128 GB · negociação concluída", "celulares", "1900.00", "iphone.jpg", 2,
             "Aparelho vendido a outro estudante. Anúncio mantido no histórico da negociação.", status="sold"),
    DemoPost("monitor-pausado", "Monitor reserva Full HD", "monitores", "390.00", "monitor.jpg", 9,
             "Anúncio temporariamente pausado enquanto confirmo a disponibilidade do equipamento.", status="paused"),
    DemoPost("meu-notebook", "Notebook para estudos · 8 GB e SSD", "notebooks", "1950.00", "notebook.jpg", None,
             "Meu notebook de estudos está disponível. Possui SSD, carregador original e funciona bem para aulas, documentos e programação.",
             attributes={"Memória RAM": "8 GB", "Armazenamento": "SSD 256 GB"}),
    DemoPost("meu-livro", "Livro de programação para quem está começando", "livros", "65.00", "livro.jpg", None,
             "Livro bem conservado com exemplos e exercícios. Estou vendendo porque concluí a disciplina. Entrego no intervalo das aulas.", condition="used"),
    DemoPost("minha-cadeira", "Cadeira de escritório regulável", "moveis", "300.00", "cadeira.jpg", None,
             "Cadeira para estudar ou trabalhar em casa. Regulagem funcionando e estrutura firme. Aceito conversar sobre o valor."),
    DemoPost("minha-mochila", "Mochila com espaço para notebook", "mochilas", "80.00", "mochila.jpg", None,
             "Mochila resistente que usei durante dois semestres. Vários compartimentos e zíperes funcionando.", condition="used", trade=True),
    DemoPost("meu-monitor", "Monitor Full HD · aguardando disponibilidade", "monitores", "480.00", "monitor.jpg", None,
             "Pausei o anúncio enquanto organizo meu novo espaço de estudos. Posso reativar assim que estiver disponível.", status="paused"),
    DemoPost("meu-controle", "Controle DualSense · vendido no campus", "games", "270.00", "controle.jpg", None,
             "Negociação concluída com um colega. Controle entregue e pagamento combinado diretamente entre nós.", status="sold"),
    DemoPost("meu-rascunho", "Tablet para leitura e anotações", "tablets", "1200.00", "ipad.jpg", None,
             "Rascunho de anúncio com fotos e informações preenchidas. Pronto para revisar e publicar na plataforma.", status="draft"),
    DemoPost("meu-expirado", "Material de anatomia do semestre passado", "livros-universitarios", "90.00", "livro.jpg", None,
             "Anúncio antigo, com prazo encerrado. O material continua em bom estado e pode ser anunciado novamente.", condition="used", status="expired"),
]
