import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import SearchBar from "../searchBar/searchBar";
import { MainArea } from "../../common/style";

const Header = () => {
  const navigate = useNavigate();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (location.pathname === "/") {
      window.location.reload();
    } else {
      navigate("/");
    }
  };

  return (
    <Container>
      <Main>

      <LogoLink href="/" onClick={handleLogoClick}>
        <Logo src="/img/mainLogo.png" alt="main logo" />
      </LogoLink>

        <SearchBar 
          placeholder ="검색어를 입력하세요." 
        />
      </Main>
    </Container>
  );
};


const Container = styled.header`
  width: 100%;
  height: 76px;
  background-color: #FFFFFF;
  z-index: 1000;
`

const Main = styled(MainArea)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin:0 auto;
  height:100%;
`

const Logo = styled.img`
  width: 34px;
  height: 34px;
  cursor: pointer;
`

const LogoLink = styled.a`
  display: flex;
  align-items: center;
`;


export default Header;
