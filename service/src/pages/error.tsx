import styled from "styled-components"
import Header from "../components/header/header"

const Error = () => {

  const handleRefresh = () => {
    window.location.reload(); // 전체 페이지 새로고침
  };

  return(
    <>
      <Header />
      <Container>
        <Main>
          <ErrorLogo src="/img/errorLogo.png" />
          <Text>서버 에러가 발생했습니다. <br /> 나중에 다시 시도해 주세요.</Text>
          <RefreshBtn onClick={handleRefresh}>새로고침</RefreshBtn>
        </Main>
      </Container>
    </>
  )                             
}


const Container = styled.div`
  width: 100%;
  height: calc(100vh - 76px);       //  header height = 76px

  display: flex;
  flex-direction: column;
  justify-content: center;
`

const Main = styled.div`

  width: 100%;
  height: 358px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap:30px;
`

const ErrorLogo = styled.img`
  width: 70px;
  height: 63px;
`

const Text = styled.p`
  font-family: 'Pretendard-SemiBold';
  font-size: 18px;
  line-height: 1.6;
  letter-spacing: -0.024em;
  color:#797979;
`

const RefreshBtn = styled.button`
  font-family: 'Pretendard-Bold';
  font-size: 12px;
  color:#FFFFFF;
  text-align: center;

  padding:10.5px 0;
  width: 257px;
  height: 40px;
  
  border-radius: 4px;
  background-color: #1E1E1E;
`

export default Error