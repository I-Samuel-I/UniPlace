export type LegalKind = "terms" | "privacy";
export type LegalSection = { title: string; paragraphs: string[] };

export const legalDocuments: Record<LegalKind, { title: string; intro: string; sections: LegalSection[] }> = {
  terms: {
    title: "Termos de uso",
    intro: "Entenda as regras para participar da comunidade e negociar no UniPlace.",
    sections: [
      { title: "Sobre este documento", paragraphs: ["Este é um exemplo de termos de uso preparado para a apresentação acadêmica do projeto UniPlace. A versão demonstra as regras de utilização da plataforma e pode ser adaptada pela equipe responsável."] },
      { title: "A comunidade UniPlace", paragraphs: ["O UniPlace conecta estudantes para anunciar produtos e serviços e conversar sobre oportunidades no ambiente acadêmico. A plataforma aproxima compradores e vendedores; valores, condições, pagamentos e entrega são combinados diretamente entre as pessoas envolvidas."] },
      { title: "Sua conta", paragraphs: ["O cadastro utiliza nome, e-mail institucional do curso e senha. Forneça informações verdadeiras e mantenha sua senha em sigilo. O e-mail institucional identifica a conta e não pode ser alterado nas configurações.", "A foto de perfil é opcional e aparece nos anúncios e nas conversas. Utilize uma imagem que você tenha autorização para publicar e que respeite as demais pessoas da comunidade."] },
      { title: "Anúncios e negociações", paragraphs: ["Descreva os itens e serviços com clareza, informe o preço e as condições reais e use fotografias que você possa compartilhar. Atualize o status do anúncio quando o item não estiver mais disponível.", "Não publique conteúdo ilegal, enganoso, discriminatório, ofensivo ou que viole direitos de outras pessoas. Não solicite senhas, códigos de autenticação ou dados financeiros desnecessários para a negociação."] },
      { title: "Convivência e segurança", paragraphs: ["Converse com respeito e utilize os recursos de denúncia quando encontrar comportamento ou anúncios inadequados. Combine a retirada em locais conhecidos e apropriados, como pontos de encontro no campus.", "Verifique as informações do anúncio e as condições do item antes de concluir uma negociação. O UniPlace não oferece pagamento, seguro ou garantia de compra dentro da aplicação apresentada."] },
      { title: "Dados e privacidade", paragraphs: ["A Política de Privacidade descreve os dados utilizados pela plataforma. Nas configurações, você pode consultar essa política, atualizar nome e foto, alterar a senha, encerrar outras sessões e baixar uma cópia dos próprios dados."] },
      { title: "Encerramento da conta", paragraphs: ["Você pode solicitar a exclusão da conta nas configurações, confirmando a senha e digitando EXCLUIR. O acesso é encerrado e os dados identificadores do perfil, os anúncios e as mensagens enviadas por você são removidos.", "Referências sem nome, e-mail ou foto permanecem para que outros participantes possam acessar as próprias mensagens. A conta excluída não pode ser reativada."] },
      { title: "Dúvidas e atualizações", paragraphs: ["Utilize a área de Ajuda e Suporte para esclarecer dúvidas ou relatar problemas. Este documento de exemplo pode ser atualizado conforme a evolução do projeto; a data da versão está indicada no início da página."] },
    ],
  },
  privacy: {
    title: "Política de privacidade",
    intro: "Saiba como seus dados são utilizados e quais controles estão disponíveis na sua conta.",
    sections: [
      { title: "Sobre este documento", paragraphs: ["Esta é uma política de exemplo para a apresentação acadêmica do projeto UniPlace. O texto descreve os recursos demonstrados na aplicação, sem representar um documento oficial de uma instituição de ensino."] },
      { title: "Dados utilizados", paragraphs: ["A conta utiliza nome, e-mail institucional, senha protegida por hash e data de cadastro. A foto de perfil é opcional. A plataforma também armazena os anúncios e imagens que você publica, favoritos, mensagens e anexos enviados, notificações e chamados de suporte.", "Os tokens de sessão ficam armazenados no navegador para manter o acesso à sua conta. O exemplo apresentado não implementa ferramentas de publicidade ou rastreamento comercial."] },
      { title: "Finalidades", paragraphs: ["Os dados permitem autenticar sua conta, identificar o autor de um anúncio, apresentar seu perfil público, manter conversas entre participantes e responder a chamados. Favoritos e notificações são associados à conta para permanecerem disponíveis entre acessos.", "A senha não é exibida no perfil nem incluída na exportação dos dados. O e-mail institucional não é publicado nos dados do vendedor ou do contato do chat."] },
      { title: "Visibilidade das informações", paragraphs: ["Seu nome e sua foto de perfil são apresentados aos demais participantes nos anúncios e conversas. As imagens de perfil e de anúncios são servidas por endereços de mídia; não publique nesses arquivos informações que devam permanecer privadas.", "As conversas e seus anexos são acessíveis pela API apenas aos participantes autorizados. Seus chamados e suas notificações ficam associados à sua conta e à equipe responsável pelo atendimento."] },
      { title: "Controles da conta", paragraphs: ["Nas configurações, você pode corrigir seu nome, substituir ou remover sua foto, alterar a senha, encerrar outras sessões e baixar os próprios dados em JSON. O e-mail institucional permanece bloqueado para edição.", "Para dúvidas ou solicitações relacionadas aos seus dados, utilize a área de Ajuda e Suporte. A Lei Geral de Proteção de Dados é uma referência para a discussão de privacidade neste projeto."] },
      { title: "Exclusão e referências anônimas", paragraphs: ["A exclusão confirmada encerra o acesso, remove nome, e-mail, foto, anúncios, favoritos, notificações, chamados e as mensagens enviadas por você. Os arquivos de foto vinculados ao perfil e aos anúncios são removidos do armazenamento da aplicação.", "Referências técnicas ficam sem nome, e-mail ou foto, identificadas como Conta excluída, para preservar as mensagens enviadas por outras pessoas. Informações que outro participante já tenha copiado ou baixado fora da plataforma não são controladas pela aplicação."] },
      { title: "Proteção do acesso", paragraphs: ["Mantenha sua senha em sigilo, encerre a sessão em computadores compartilhados e utilize o recurso de encerrar outras sessões quando necessário. Alterar a senha também encerra as sessões anteriores, mantendo o acesso atual renovado."] },
      { title: "Contato e versão", paragraphs: ["A área de Ajuda e Suporte é o canal demonstrativo para dúvidas e solicitações. Esta política de exemplo pode ser ajustada conforme os recursos e as definições da equipe responsável pelo projeto."] },
    ],
  },
};

export function legalKindFromPath(path: string): LegalKind | null {
  const normalized = path.replace(/\/+$/, "");
  return normalized === "/termos-de-uso" ? "terms" : normalized === "/politica-de-privacidade" ? "privacy" : null;
}
