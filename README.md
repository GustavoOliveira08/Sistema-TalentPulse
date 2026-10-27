# TalentPulse — Sistema de Gestão de RH e People Analytics

## 1. Sobre o projeto

O TalentPulse é um sistema acadêmico em desenvolvimento, voltado à gestão de Recursos Humanos (RH) e People Analytics. Seu objetivo é centralizar informações relacionadas aos colaboradores, departamentos, cargos, recrutamento, treinamentos, avaliações de desempenho e histórico salarial.

A proposta é utilizar um banco de dados relacional para organizar as informações, reduzir inconsistências e facilitar a consulta e a análise de dados, contribuindo para uma gestão de pessoas mais eficiente.

## 2. Contextualização do problema

Empresas que realizam o gerenciamento de Recursos Humanos por meio de planilhas, documentos separados ou registros manuais podem enfrentar dificuldades para manter as informações organizadas e atualizadas.

Entre os principais problemas estão:

- Duplicidade e inconsistência de informações.
- Dificuldade para localizar dados dos colaboradores.
- Falta de integração entre os processos de RH.
- Dificuldade para acompanhar alterações salariais e movimentações profissionais.
- Limitações na análise de recrutamento, treinamentos e desempenho.
- Maior risco de perda de informações e falhas operacionais.

Sem um Sistema Gerenciador de Banco de Dados (SGBD) relacional, a empresa pode ter dificuldades para manter a integridade, a segurança e a consistência dos dados.

## 3. Proposta de solução

O TalentPulse propõe a utilização do MySQL como SGBD relacional para estruturar e centralizar as informações de Recursos Humanos.

Com a implementação de tabelas relacionadas por chaves primárias e estrangeiras, o sistema busca reduzir a redundância de dados, estabelecer relacionamentos entre as informações e permitir consultas mais precisas.

A solução também contempla consultas SQL para apoiar a análise dos dados e a geração de informações relevantes para a gestão de pessoas.

## 4. Funcionalidades e áreas do sistema

O banco de dados foi planejado para contemplar as seguintes áreas:

- **Departamentos:** organização dos setores da empresa.
- **Cargos:** registro das funções profissionais e suas características.
- **Colaboradores:** armazenamento dos dados cadastrais dos funcionários.
- **Histórico salarial:** registro das alterações salariais ao longo do tempo.
- **Vagas:** gerenciamento das oportunidades de emprego.
- **Candidatos:** organização das informações dos participantes dos processos seletivos.
- **Candidaturas:** associação entre candidatos e vagas.
- **Treinamentos:** gerenciamento dos programas de capacitação.
- **Matrículas em treinamentos:** registro da participação dos colaboradores nas capacitações.
- **Avaliações de desempenho:** armazenamento das avaliações realizadas.

Essas áreas permitem estruturar diferentes processos de RH em um único banco de dados, facilitando o acesso às informações e a análise dos registros.

## 5. Tecnologias utilizadas

- **MySQL 8.0:** sistema gerenciador de banco de dados relacional.
- **InnoDB:** mecanismo de armazenamento utilizado para oferecer suporte a transações e integridade referencial.
- **SQL:** linguagem utilizada para definição das estruturas, manipulação dos dados e execução das consultas.
- **HTML:** estruturação das páginas da interface.
- **CSS:** estilização e organização visual da interface.
- **JavaScript:** implementação de interações e comportamentos no lado do cliente.
- **Git e GitHub:** versionamento e armazenamento do código-fonte do projeto.
- **Aiven e Microsoft Azure:** plataformas consideradas para hospedagem e disponibilização do banco de dados em nuvem.

## 6. Estrutura do banco de dados

O projeto utiliza o schema `talentpulse_rh`, destinado à organização das tabelas e dos relacionamentos do sistema.

A estrutura foi planejada com dez tabelas principais, distribuídas entre cadastro organizacional, gestão de colaboradores, recrutamento e desenvolvimento profissional.

As tabelas são relacionadas por meio de chaves primárias (PK) e chaves estrangeiras (FK), permitindo associar registros e estabelecer regras de integridade referencial.

### Relacionamentos

Os relacionamentos representam as conexões entre as entidades do sistema. Entre os exemplos previstos estão:

- Um departamento pode possuir vários colaboradores.
- Um cargo pode estar associado a vários colaboradores.
- Um colaborador pode possuir vários registros de histórico salarial.
- Uma vaga pode receber várias candidaturas.
- Um candidato pode participar de diferentes processos seletivos.
- Um treinamento pode possuir várias matrículas.
- Um colaborador pode participar de diferentes treinamentos.
- Um colaborador pode possuir registros de avaliações de desempenho.

As cardinalidades exatas dependem das regras de negócio definidas para cada relacionamento.

## 7. Normalização dos dados

A modelagem do banco de dados considera os princípios de normalização relacional, com o objetivo de organizar as informações e reduzir redundâncias.

As formas normais estudadas no projeto incluem:

- **Primeira Forma Normal (1FN):** organização dos atributos em valores atômicos, evitando grupos repetitivos.
- **Segunda Forma Normal (2FN):** eliminação de dependências parciais em relação às chaves candidatas.
- **Terceira Forma Normal (3FN):** redução de dependências transitivas entre atributos não chave.
- **Quarta Forma Normal (4FN):** tratamento de dependências multivaloradas independentes.

A aplicação dessas formas normais deve ser verificada conforme a estrutura efetiva das tabelas e suas dependências funcionais.

## 8. Consultas SQL e análise de dados

O projeto contempla um conjunto de 15 consultas SQL contextualizadas com situações do setor de Recursos Humanos.

As consultas têm como finalidade demonstrar a capacidade de recuperar, relacionar, filtrar, ordenar e agregar informações armazenadas no banco de dados.

Entre as possibilidades de análise estão:

- Consulta de colaboradores por departamento e cargo.
- Pesquisa de informações cadastrais.
- Análise do histórico salarial.
- Acompanhamento de vagas e candidaturas.
- Identificação de candidatos em processos seletivos.
- Consulta de treinamentos e participantes.
- Análise dos registros de avaliação de desempenho.
- Geração de indicadores para apoiar decisões de RH.

As consultas são parte importante do projeto porque demonstram como os dados estruturados podem ser transformados em informações úteis para a empresa.

## 9. Banco de dados em nuvem

O projeto considera a utilização de serviços de nuvem, como Aiven e Microsoft Azure, para avaliar alternativas de hospedagem do banco de dados.

A disponibilização em nuvem pode facilitar o acesso remoto, a integração com aplicações e a manutenção da infraestrutura, desde que sejam configuradas adequadamente as permissões, as regras de rede, a autenticação e a proteção das informações.

A efetiva utilização dessas plataformas depende da configuração realizada durante o desenvolvimento.

## 10. Interface e integração

A interface do TalentPulse é planejada com HTML, CSS e JavaScript, tecnologias utilizadas para estruturar, estilizar e adicionar interatividade às páginas.

A integração entre a interface e o banco de dados depende de uma camada de comunicação apropriada, responsável por executar operações e controlar o acesso às informações.

As funcionalidades efetivamente disponíveis na interface devem ser consideradas conforme o estágio atual de implementação do projeto.

## 11. Versionamento e organização

O Git é utilizado para acompanhar as alterações realizadas durante o desenvolvimento, enquanto o GitHub permite armazenar o repositório e colaborar com outros integrantes da equipe.

O versionamento contribui para organizar o histórico de mudanças, acompanhar a evolução do projeto e facilitar a manutenção dos arquivos.

## 12. Objetivos do projeto

O desenvolvimento do TalentPulse busca:

- Aplicar conceitos de modelagem de dados relacionais.
- Implementar estruturas com chaves primárias e estrangeiras.
- Compreender e aplicar princípios de normalização.
- Desenvolver consultas SQL voltadas a situações reais de RH.
- Demonstrar a importância da integridade e da organização dos dados.
- Explorar alternativas de hospedagem de banco de dados em nuvem.
- Relacionar conhecimentos de banco de dados ao desenvolvimento de sistemas.

## 13. Status do projeto

**Em desenvolvimento.**

O TalentPulse é um projeto acadêmico voltado à aplicação prática de conceitos de banco de dados, desenvolvimento web e gestão de Recursos Humanos.

As funcionalidades, integrações e configurações de infraestrutura estão sujeitas à evolução da implementação.

## 14. Considerações finais

O TalentPulse demonstra como um banco de dados relacional pode contribuir para a organização dos processos de Recursos Humanos, oferecendo uma estrutura para centralizar informações, estabelecer relacionamentos entre registros e produzir consultas relevantes para a gestão de pessoas.

Além de atender aos objetivos acadêmicos, o projeto proporciona experiência prática com modelagem relacional, SQL, normalização, versionamento e tecnologias utilizadas no desenvolvimento de sistemas.
