import React from 'react';
import { Layout, Typography, Card } from 'antd';
import Header from '../components/Header';
import { AuthProvider } from '../context/AuthContext';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const About = () => {
  return (
    <AuthProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Header productId={null} />
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card>
            <Title level={2}>About Us</Title>
            <Paragraph>
              Learn more about our company and mission.
            </Paragraph>
            {/* Add your about content here */}
          </Card>
        </Content>
      </Layout>
    </AuthProvider>
  );
};

export default About;


