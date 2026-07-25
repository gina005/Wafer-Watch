import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewsFeed from './pages/NewsFeed.jsx'
import Companies from './pages/Companies.jsx'
import NodeRoadmap from './pages/NodeRoadmap.jsx'
import Analysis from './pages/Analysis.jsx'
import About from './pages/About.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/roadmap" element={<NodeRoadmap />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Layout>
  )
}
