import { ArrowLeft, FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './ProductPages.module.css';

export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }): React.JSX.Element {
  const privacy = kind === 'privacy';
  return (
    <main className={styles.legalPage}>
      <article className={styles.legalCard}>
        <Link className={styles.backLink} to="/register">
          <ArrowLeft size={17} />
          返回注册
        </Link>
        <div className={styles.draftNotice}>
          <FileWarning size={22} />
          <div>
            <strong>开发阶段草案</strong>
            <span>本文档尚未经正式法律审核，不代表产品已经具备公开运营条件。</span>
          </div>
        </div>
        <p className={styles.eyebrow}>版本 draft-2026-09-10</p>
        <h1>{privacy ? '隐私政策草案' : '用户协议草案'}</h1>
        {privacy ? (
          <>
            <h2>我们处理的信息</h2>
            <p>
              本阶段仅处理作为登录标识的中国大陆手机号、密码的不可逆哈希、协议接受记录，以及维持安全登录所需的服务器端会话。验证码和会话属于限时数据。
            </p>
            <h2>信息安全</h2>
            <p>
              密码不会以明文或可逆形式保存；验证码、会话标识与安全秘密不会出现在普通日志、截图或项目证据中。
            </p>
            <h2>尚未包含</h2>
            <p>宝宝档案、照片、视频、成长记录与家庭资料不属于本阶段功能，也不会自动创建。</p>
          </>
        ) : (
          <>
            <h2>服务范围</h2>
            <p>
              本草案仅用于开发和内部验证账号注册、登录与会话功能。正式上线前将由独立工作替换为经审核版本。
            </p>
            <h2>账号安全</h2>
            <p>
              请使用长度不少于 12
              个字符的独立密码，并妥善保管验证码。密码重置后，已有登录会话将失效。
            </p>
            <h2>使用限制</h2>
            <p>请勿在开发或测试环境输入真实儿童信息、真实邀请码或敏感成长记录。</p>
          </>
        )}
      </article>
    </main>
  );
}
