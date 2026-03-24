# Polish-DWR DB設計書

業務日報ウェブアプリ Polish-DWR 向けのデータベース設計書です。要件定義および基本設計をもとに、PostgreSQL を前提とした論理設計・物理設計方針を整理します。

## 1. 設計方針

- DBMS は PostgreSQL を採用する
- 本番環境は Neon、ローカル開発環境は Docker 上の PostgreSQL を想定する
- 日報データの登録、検索、集計を主用途とするため、検索条件と集計条件を意識したインデックス設計を行う
- 認証対象は管理者のみとし、パスワードはハッシュ値のみ保存する
- 監査性と保守性を考慮し、主要テーブルには作成日時と更新日時を持たせる
- 論理削除が必要になった場合に拡張しやすい設計とするが、初期実装では物理削除を前提とする

## 2. ER概要

初期リリース時点の主要エンティティは以下の 2 つとする。

1. administrators
2. daily_work_reports

リレーション:

- administrators 1 : N daily_work_reports
- 1 人の管理者が複数の日報を登録できる
- 1 件の日報は 1 人の登録管理者に紐づく

## 3. テーブル一覧

| テーブル名 | 概要 |
| --- | --- |
| administrators | 管理者アカウントを管理する |
| daily_work_reports | 業務日報データを管理する |

## 4. テーブル設計

### 4.1 administrators

管理者アカウント情報を保持する。

| カラム名 | データ型 | NULL | デフォルト | 制約 | 説明 |
| --- | --- | --- | --- | --- | --- |
| id | uuid | NOT NULL | gen_random_uuid() | PK | 管理者ID |
| name | varchar(100) | NOT NULL | なし |  | 管理者名 |
| email | varchar(255) | NOT NULL | なし | UNIQUE | ログイン用メールアドレス |
| password_hash | varchar(255) | NOT NULL | なし |  | ハッシュ化済みパスワード |
| created_at | timestamptz | NOT NULL | now() |  | 作成日時 |
| updated_at | timestamptz | NOT NULL | now() |  | 更新日時 |

制約方針:

- primary key: id
- unique key: email
- email はアプリケーション側で正規化した上で保存する
- password_hash には平文を保存しない

### 4.2 daily_work_reports

業務日報の明細情報を保持する。

| カラム名 | データ型 | NULL | デフォルト | 制約 | 説明 |
| --- | --- | --- | --- | --- | --- |
| id | uuid | NOT NULL | gen_random_uuid() | PK | 日報ID |
| work_date | date | NOT NULL | なし |  | 業務実施日 |
| client_code | varchar(50) | NOT NULL | なし |  | 得意先コード |
| client_name | varchar(255) | NOT NULL | なし |  | 得意先名 |
| work_minutes | integer | NOT NULL | 0 | CHECK >= 0 | 作業分 |
| labor_minutes | integer | NOT NULL | 0 | CHECK >= 0 | 工数分 |
| travel_minutes | integer | NOT NULL | 0 | CHECK >= 0 | 移動分 |
| car_type | varchar(100) | NULL | なし |  | 車種 |
| work_code | varchar(50) | NOT NULL | なし |  | 作業コード |
| customer_status | varchar(20) | NOT NULL | なし | CHECK IN ('new', 'existing') | 新規/既存 |
| unit_count | integer | NOT NULL | 0 | CHECK >= 0 | 台数 |
| sales_amount | numeric(12, 2) | NOT NULL | 0 | CHECK >= 0 | 売上金額 |
| standard_minutes | integer | NULL | なし | CHECK >= 0 | 基準分 |
| points | numeric(10, 2) | NULL | なし | CHECK >= 0 | ポイント |
| remarks | text | NULL | なし |  | 備考 |
| created_by | uuid | NOT NULL | なし | FK | 登録管理者ID |
| created_at | timestamptz | NOT NULL | now() |  | 作成日時 |
| updated_at | timestamptz | NOT NULL | now() |  | 更新日時 |

制約方針:

- primary key: id
- foreign key: created_by references administrators(id)
- customer_status はアプリケーション上の表示値としては 新規 / 既存 を使い、DB 上は new / existing で保持する
- 数値項目は初期実装では負数を許可しない

## 5. インデックス設計

検索と集計の頻度を考慮し、以下のインデックスを定義する。

### 5.1 administrators

| インデックス名 | 対象カラム | 種別 | 目的 |
| --- | --- | --- | --- |
| uq_administrators_email | email | UNIQUE | ログイン時の一意検索 |

### 5.2 daily_work_reports

| インデックス名 | 対象カラム | 種別 | 目的 |
| --- | --- | --- | --- |
| idx_dwr_work_date | work_date | BTREE | 期間検索 |
| idx_dwr_client_code | client_code | BTREE | 得意先コード検索 |
| idx_dwr_client_name | client_name | BTREE | 得意先名検索 |
| idx_dwr_work_code | work_code | BTREE | 作業コード検索 |
| idx_dwr_customer_status | customer_status | BTREE | 新規/既存検索 |
| idx_dwr_created_by | created_by | BTREE | 登録管理者単位の検索 |
| idx_dwr_work_date_client_code | work_date, client_code | BTREE | 期間 + 得意先コード複合検索 |

補足:

- 得意先名の部分一致検索が増える場合は pg_trgm 拡張と GIN インデックスを追加検討する
- 集計の中心が日付範囲になるため、まずは work_date を最優先で最適化する

## 6. 正規化方針

初期実装では検索性と実装速度を優先し、日報テーブルに得意先名、車種、作業コードを直接保持する。

将来的な分離候補:

1. clients テーブル
2. work_codes マスターテーブル
3. car_types マスターテーブル

ただし初期段階でマスタ化すると運用要件が未確定なまま複雑度が上がるため、まずは単一テーブル中心の設計とする。

## 7. 想定DDL

```sql
create extension if not exists pgcrypto;

create table administrators (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table daily_work_reports (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  client_code varchar(50) not null,
  client_name varchar(255) not null,
  work_minutes integer not null default 0 check (work_minutes >= 0),
  labor_minutes integer not null default 0 check (labor_minutes >= 0),
  travel_minutes integer not null default 0 check (travel_minutes >= 0),
  car_type varchar(100),
  work_code varchar(50) not null,
  customer_status varchar(20) not null check (customer_status in ('new', 'existing')),
  unit_count integer not null default 0 check (unit_count >= 0),
  sales_amount numeric(12, 2) not null default 0 check (sales_amount >= 0),
  standard_minutes integer check (standard_minutes >= 0),
  points numeric(10, 2) check (points >= 0),
  remarks text,
  created_by uuid not null references administrators(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dwr_work_date on daily_work_reports (work_date);
create index idx_dwr_client_code on daily_work_reports (client_code);
create index idx_dwr_client_name on daily_work_reports (client_name);
create index idx_dwr_work_code on daily_work_reports (work_code);
create index idx_dwr_customer_status on daily_work_reports (customer_status);
create index idx_dwr_created_by on daily_work_reports (created_by);
create index idx_dwr_work_date_client_code on daily_work_reports (work_date, client_code);
```

## 8. 集計観点の設計

日報一覧と PDF 出力で利用する主な集計項目は以下とする。

| 集計項目 | 対象カラム | 集計方法 |
| --- | --- | --- |
| 件数 | id | count |
| 作業分合計 | work_minutes | sum |
| 工数分合計 | labor_minutes | sum |
| 移動分合計 | travel_minutes | sum |
| 台数合計 | unit_count | sum |
| 売上金額合計 | sales_amount | sum |
| 基準分合計 | standard_minutes | sum |
| ポイント合計 | points | sum |

主な集計軸:

1. 日付範囲
2. 得意先コード
3. 得意先名
4. 作業コード
5. 新規/既存
6. 登録管理者

## 9. 初期データ設計

初期管理者は環境変数またはセットアップスクリプトから登録する。

想定環境変数:

- INITIAL_ADMIN_NAME
- INITIAL_ADMIN_EMAIL
- INITIAL_ADMIN_PASSWORD

投入方針:

- 初回起動または初期化処理時に administrators に未登録の場合のみ作成する
- 初期管理者作成時も password_hash を保存し、平文は保存しない

## 10. 運用・拡張方針

- 更新日時 updated_at はアプリケーション側または DB トリガーで更新する
- 将来的に論理削除が必要な場合は deleted_at カラム追加で対応する
- 監査ログが必要になった場合は daily_work_report_histories などの履歴テーブルを追加する
- 高度な検索が必要になった場合は全文検索や検索専用インデックスを追加する

## 11. 既知の保留事項

- 売上金額とポイントの小数点運用ルール
- 得意先、車種、作業コードのマスタ化要否
- 管理者権限の多段階化要否
- PDF 出力時のスナップショット保存要否
