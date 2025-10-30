import styled from "styled-components";
import Header from "../components/header/header";
import { colors } from "../common/designSystem";
import BestBlog from "../components/dashboard/bestBlog";
import { MainContents } from "../common/style";
import DashboardCard from "../components/dashboard/dashboardCard";
import axios from "axios";
import { useEffect, useState } from "react";
import { formatNumber } from "../utils/numberFormat";
import { calculateAllStats } from "../utils/stat";
import { usePosts } from "../hooks/usePosts";


interface ViewDataType {
  view_id: number;
  post_id: string;
  view: number
  regDate: string;
}

interface VisitDataType {
  visit_id: number,
  visit: number,
  regDate: string;
}

const Dashboard = () => {
  const [todayViews, setTodayViews] = useState<string>("0");
  const [totalViews, setTotalViews] = useState<string>("0");
  const [todayVisits, setTodayVisits] = useState<string>("0");
  const [totalVisits, setTotalVisits] = useState<string>("0");
  const [BackupPostCount, setBackupPostCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const { data = [], refetch: refetchPosts } = usePosts();

  const formatCurrentTime = () => {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 기준`;
  };

  const getBestBlogs = () => {
    if (!data || data.length === 0) return [];
    
    // 언어 감지 함수 (첫 글자 기준)
    const detectLanguage = (text: string): 'english' | 'korean' | 'other' => {
      if (!text || text.length === 0) return 'other';
      
      const firstChar = text.charAt(0);
      const firstCharCode = firstChar.charCodeAt(0);
      
      // 한글 유니코드 범위: 0xAC00-0xD7AF
      if (firstCharCode >= 0xAC00 && firstCharCode <= 0xD7AF) return 'korean';
      // 영문자 범위: A-Z, a-z
      if ((firstCharCode >= 65 && firstCharCode <= 90) || (firstCharCode >= 97 && firstCharCode <= 122)) return 'english';
      return 'other';
    };

    // 정렬 함수
    const sortPosts = (a: any, b: any) => {
      const aView = a.postView?.view || 0;
      const bView = b.postView?.view || 0;
      
      // 1차: 조회수 내림차순
      if (aView !== bView) return bView - aView;
      
      // 2차: 언어별 우선순위 (영어 > 한국어 > 기타)
      const aLang = detectLanguage(a.title);
      const bLang = detectLanguage(b.title);
      
      const languagePriority = { english: 1, korean: 2, other: 3 };
      const langDiff = languagePriority[aLang] - languagePriority[bLang];
      if (langDiff !== 0) return langDiff;
      
      // 3차: 같은 언어 내에서 사전순 정렬
      if (aLang === 'english' && bLang === 'english') {
        return a.title.localeCompare(b.title, 'en');
      }
      if (aLang === 'korean' && bLang === 'korean') {
        return a.title.localeCompare(b.title, 'ko-KR');
      }
      
      return 0;
    };

    return data.sort(sortPosts).slice(0, 5);
  };

  const getViewData = async () => {
    try {
      const { data } = await axios.get<ViewDataType[]>(
        `http://116.42.245.135/api/admin/view/select/all`
      );
      return data;
    } catch (e) {
      console.log(e);
      return [];
    }
  };

  const getVisitData = async () => {
    try {
      const { data } = await axios.get<VisitDataType[]>(`http://116.42.245.135/api/admin/visit/select/all`); 
      return data;
    } catch (e) {
      console.log(e);
      return [];
    }
  };

  const getBackupPost = async () => {
    try{
      const {data} = await axios.get(`http://116.42.245.135/api/admin/post/select/tempList`);
      console.log(data);
      return data;
    }catch(e){
      console.log(e);
      return [];
    }
  }

  const fetchData = async () => {
    try {
      const [viewData, visitData, backupData] = await Promise.all([
        getViewData(),
        getVisitData(),
        getBackupPost(),
        refetchPosts()
      ]);
      
      const stats = calculateAllStats(viewData, visitData);
      
      setTodayViews(formatNumber(stats.todayViews));
      setTotalViews(formatNumber(stats.totalViews));
      setTodayVisits(formatNumber(stats.todayVisits));
      setTotalVisits(formatNumber(stats.totalVisits));
      setBackupPostCount(backupData.length);

      setLastUpdated(formatCurrentTime());
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return(
    <Container>
      <Header title = "대시보드" />

      <MainContents>
        <ViewArea>
          <ViewHeader>
            <ViewHeaderTitle>조회수/방문자수 현황</ViewHeaderTitle>
            <TimeAndRefresh>
              <Time>{lastUpdated}</Time>
              <RefreshArea onClick={fetchData}>
                <RefreshTxt>새로고침</RefreshTxt>
                <RefreshImg src="/admin/img/icon_refresh.png" alt="refresh"/>
              </RefreshArea>
            </TimeAndRefresh>
          </ViewHeader>
          
          <CardWrapper>
            <DashboardCard text={"오늘 조회수"} number={todayViews} />
            <DashboardCard text={"누적 조회수"} number={totalViews} />
            <DashboardCard text={"오늘 방문자"} number={todayVisits} />
            <DashboardCard text={"누적 방문자"} number={totalVisits} />
          </CardWrapper>
        </ViewArea>

        <PostArea>
          <PostHeader>게시물 현황</PostHeader>
          <CardWrapper>
            <DashboardCard text={"총 발행 게시글"} number={formatNumber(data.length)} />
            <DashboardCard text={"임시저장된 게시글"} number={formatNumber(BackupPostCount)} />
          </CardWrapper>
        </PostArea>

        <BestArea>
          <BestAreaHeader>인기글</BestAreaHeader>
          <BestBlogWrapper>
            {getBestBlogs().map((post, index) => (
              <BestBlog 
                key={post.post_id}
                ranking={index + 1} 
                category={post.category?.name || "카테고리 없음"} 
                date={post.regDate ? new Date(post.regDate).toLocaleDateString('ko-KR').replace(/\./g, '.').replace(/\s/g, '') : "날짜 없음"} 
                author={post.reg_user || "작성자 없음"} 
                title={post.title || "제목 없음"}
              />
            ))}

            {getBestBlogs().length === 0 && (
            <div style={{height:"305px", width:"100%"}}>
            </div>)}


          </BestBlogWrapper>
        </BestArea>
      </MainContents>
    </Container>
  )
}

const Container = styled.div`
  width:100%;
`

const ViewArea = styled.div`
  width: 100%;
`

const ViewHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ViewHeaderTitle = styled.h2`
  font-family: 'Pretendard-SemiBold';
  font-size: 18px;
  color:${colors.Black};
`

const TimeAndRefresh = styled.div`
  width: auto;
  display: flex;
  align-items: center;
  gap:16px;
`


const Time = styled.div`
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color:${colors.Black};

`

const RefreshArea = styled.div`
  display: flex;
  align-items: center;
  gap:4px;
  cursor: pointer;
`

const RefreshTxt = styled.div`
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color:${colors.Black};
`

const RefreshImg = styled.img`
  width: 16px;
  height: 16px;
`

const CardWrapper = styled.div`
  margin-top: 32px;
  display: flex;
  gap:20px;
  justify-content: space-between;
`

const PostArea = styled.div`
  width: 100%;
  margin-top: 50px;
`
const PostHeader = styled(ViewHeaderTitle)`
  padding:16.5px 0;
`

const BestArea = styled.div`
  margin-top: 32px;
  margin-bottom: 63px;
  padding: 37px 32px;
  border: 1px solid ${colors.LightGray[300]};
  border-radius: 12px;
`

const BestAreaHeader = styled.div`
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  color:${colors.Black};
`

const BestBlogWrapper = styled.div`
  margin-top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap:16px;
`



export default Dashboard;