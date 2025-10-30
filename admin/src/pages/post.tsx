import styled from "styled-components";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/header/header";
import { colors } from "../common/designSystem";
import { usePosts } from "../hooks/usePosts";
import usePagination from "../hooks/usePagination";
import Pagination from "../components/pagination/pagination";
import { PostType, Category } from "../common/type";

interface FilterState {
  startDate: string;
  endDate: string;
  postStatus: string;
  category: string;
  searchType: string;
  searchTerm: string;
}

const API_URL = "";


const Post = () => {
  const navigate = useNavigate();
  const { data: allPosts = [] } = usePosts();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tempPosts, setTempPosts] = useState<PostType[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    postStatus: "전체",
    category: "전체",
    searchType: "전체",
    searchTerm: ""
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [dateErrors, setDateErrors] = useState<{start?: string, end?: string}>({});
  const [activePeriodButton, setActivePeriodButton] = useState<string>("이번달");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 커스텀 드롭다운 상태들
  const [isPostStatusOpen, setIsPostStatusOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSearchTypeOpen, setIsSearchTypeOpen] = useState(false);

  // 카테고리 데이터 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/client/category/select/all`);
        setCategories(data);
      } catch (error) {
        console.error('카테고리 데이터 가져오기 실패:', error);
      }
    };
    fetchCategories();
  }, []);

  // 임시저장 데이터 가져오기
  useEffect(() => {
    const fetchTempPosts = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/admin/post/select/tempList`);

        setTempPosts(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchTempPosts();
  }, []);

  // 일반 데이터와 임시저장 데이터 합치기
  const combinedPosts = useMemo(() => {
    const combined = [...allPosts, ...tempPosts];
    return combined;
  }, [allPosts, tempPosts]);

  // 날짜 범위 계산 함수들
  const getDateRange = (period: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    switch (period) {
      case "이번달":
        return {
          startDate: new Date(year, month, 1),
          endDate: today
        };
      case "3개월":
        const threeMonthsAgo = new Date(year, month - 2, 1);
        return {
          startDate: threeMonthsAgo,
          endDate: today
        };
      case "6개월":
        const sixMonthsAgo = new Date(year, month - 5, 1);
        return {
          startDate: sixMonthsAgo,
          endDate: today
        };
      default:
        return null;
    }
  };

  // 기간 버튼 클릭 핸들러
  const handlePeriodClick = useCallback((period: string) => {
    const dateRange = getDateRange(period);
    if (dateRange) {
      setActivePeriodButton(period);
      setDateErrors({}); // 오류 상태 초기화
      setFilters(prev => ({
        ...prev,
        startDate: formatDate(dateRange.startDate),
        endDate: formatDate(dateRange.endDate)
      }));
    }
  }, []);

  // 초기 렌더링 시 이번달로 설정
  useEffect(() => {
    const dateRange = getDateRange("이번달");
    if (dateRange) {
      setActivePeriodButton("이번달");
      setDateErrors({}); // 오류 상태 초기화
      setFilters(prev => ({
        ...prev,
        startDate: formatDate(dateRange.startDate),
        endDate: formatDate(dateRange.endDate)
      }));
    }
  }, []);

  // 커스텀 드롭다운 핸들러들
  const handlePostStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, postStatus: value }));
    setIsPostStatusOpen(false);
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value }));
    setIsCategoryOpen(false);
  };

  const handleSearchTypeChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchType: value }));
    setIsSearchTypeOpen(false);
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setIsPostStatusOpen(false);
        setIsCategoryOpen(false);
        setIsSearchTypeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 날짜 포맷팅 함수
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 날짜 입력 핸들러
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 오늘의 끝까지
    
    // 직접 날짜 선택 시 고정 기간 버튼 해제
    setActivePeriodButton("");
    
    // 오류 상태 초기화
    setDateErrors(prev => ({ ...prev, [type]: undefined }));
    
    // 미래 날짜 체크
    if (date > today) {
      setDateErrors(prev => ({ ...prev, [type]: "미래 날짜는 지정할 수 없습니다." }));
      return;
    }

    setFilters(prev => {
      const newFilters = { ...prev };
      const formattedDate = formatDate(date);
      
      if (type === 'start') {
        newFilters.startDate = formattedDate;
        
        // 시작일이 종료일보다 이후인 경우 종료일을 시작일 +1일로 조정
        if (newFilters.endDate) {
          const endDate = new Date(newFilters.endDate.replace(/\./g, '-'));
          if (date > endDate) {
            const newEndDate = new Date(date);
            newEndDate.setDate(newEndDate.getDate() + 1);
            
            // 조정된 종료일이 미래 날짜인 경우, 시작일과 종료일을 같게 설정
            if (newEndDate > today) {
              newFilters.endDate = formattedDate; // 시작일과 같게 설정
            } else {
              newFilters.endDate = formatDate(newEndDate);
            }
          }
        }
      } else {
        newFilters.endDate = formattedDate;
        
        // 종료일이 시작일보다 이전인 경우 시작일을 종료일 -1일로 조정
        if (newFilters.startDate) {
          const startDate = new Date(newFilters.startDate.replace(/\./g, '-'));
          if (date < startDate) {
            const newStartDate = new Date(date);
            newStartDate.setDate(newStartDate.getDate() - 1);
            newFilters.startDate = formatDate(newStartDate);
          }
        }
      }
      
      return newFilters;
    });
  };

  // 필터링된 포스트 데이터 (검색 버튼을 눌렀을 때만 업데이트)
  const [filteredPosts, setFilteredPosts] = useState<PostType[]>([]);

  // 검색 실행
  const handleSearch = () => {
    let filtered = [...combinedPosts];

    // 날짜 필터링 (regDate 사용)
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate.replace(/\./g, '-'));
      const endDate = new Date(filters.endDate.replace(/\./g, '-'));
      endDate.setHours(23, 59, 59, 999); // 하루 끝까지 포함

      filtered = filtered.filter(post => {
        const postDate = new Date(post.regDate);
        return postDate >= startDate && postDate <= endDate;
      });
    }

    // 상태 필터링 (content.state.state_id 사용: 1=등록, 2=임시저장)
    if (filters.postStatus !== "전체") {
      const targetStateId = filters.postStatus === "등록" ? 1 : 2;
      filtered = filtered.filter(post => {
        // 임시저장 데이터의 경우 content.state가 없을 수 있으므로 안전하게 처리
        if (post.content && post.content.state && post.content.state.state_id) {
          return post.content.state.state_id === targetStateId;
        }
        // 임시저장 데이터의 경우 다른 방식으로 구분할 수 있음
        return false;
      });
    }

    // 카테고리 필터링 (category.name 사용)
    if (filters.category !== "전체") {
      filtered = filtered.filter(post => {
        // 임시저장 데이터의 경우 category 구조가 다를 수 있음
        if (post.category && post.category.name) {
          return post.category.name === filters.category;
        }
        return false;
      });
    }

    // 검색어 필터링 (title, content.content 사용)
    if (filters.searchTerm) {
      filtered = filtered.filter(post => {
        const searchTerm = filters.searchTerm.toLowerCase();
        switch (filters.searchType) {
          case "제목":
            return post.title && post.title.toLowerCase().includes(searchTerm);
          case "내용":
            return post.content && post.content.content && post.content.content.toLowerCase().includes(searchTerm);
          case "전체":
          default:
            const titleMatch = post.title && post.title.toLowerCase().includes(searchTerm);
            const contentMatch = post.content && post.content.content && post.content.content.toLowerCase().includes(searchTerm);
            return titleMatch || contentMatch;
        }
      });
    }
    // 최신순 정렬 (regDate 내림차순)
    filtered = filtered.sort((a, b) => new Date(b.regDate).getTime() - new Date(a.regDate).getTime());
    setFilteredPosts(filtered);
    setHasSearched(true);
    setSelectedPosts([]);
  };

  // 초기화
  const handleReset = () => {
    setFilters({
      startDate: "",
      endDate: "",
      postStatus: "전체",
      category: "전체",
      searchType: "전체",
      searchTerm: ""
    });

    setDateErrors({});
    setActivePeriodButton("이번달");
    // 초기화 시 이번달로 설정
    handlePeriodClick("이번달");
  };

  // 필터 토글 핸들러
  const handleFilterToggle = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  // 등록 버튼 클릭 핸들러
  const handleGoToCreate = () => {
    navigate('/post/create');
  };

  // 체크박스 핸들러
  const handlePostSelect = (postId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(id => id !== postId));
    }
  };

  // 전체 선택/해제 핸들러
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      // 현재 페이지의 모든 게시물 선택
      setSelectedPosts(currentPosts.map(post => post.post_id));
    } else {
      // 모든 선택 해제
      setSelectedPosts([]);
    }
  };

  // 게시물 삭제 핸들러
  const handleDeletePosts = async () => {
    if (selectedPosts.length === 0) return;

    try {
      // 선택된 게시물들을 하나씩 삭제
      const deletePromises = selectedPosts.map(async (postId) => {
        const {data} = await axios.delete(`${API_URL}/api/admin/post/delete/${postId}`); // 여기 확인할 것  
      });

      // 모든 삭제 요청이 완료될 때까지 대기
      const results = await Promise.all(deletePromises);
      setSelectedPosts([]);
      window.location.reload();
    } catch (e) {
    }
  };

  // 페이지네이션
  const { currentPage, totalPages, currentPosts, goToPage } = usePagination(filteredPosts, 50);

  return (
    <Container>
      <Header title="게시글 관리">
        <GoToCreate onClick={handleGoToCreate}>등록</GoToCreate>
      </Header>
      
      <MainContent>
        {/* 필터 설정 */}
        <FilterSection>
          <FilterHeader>
            <FilterTitle>필터 설정</FilterTitle>
            <FilterToggle onClick={handleFilterToggle}>
              <span>{isFilterExpanded ? "접기" : "펼치기"}</span>
              <img src={isFilterExpanded ? "/admin/img/icon_arrowUp.png" : "/admin/img/icon_arrowDown.png"} />
            </FilterToggle>
          </FilterHeader>
          
          {isFilterExpanded && (
            <SelectContainer>
            <FilterDateRow>
              <FilterItem>
                <FilterLabel>기간</FilterLabel>
                <DateInputs>
                  <DateInputWrapper>
                    <CustomDateInput>
                      <DateInput
                        type="date"
                        value={filters.startDate ? filters.startDate.replace(/\./g, '-') : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('start', e.target.value)}
                        $hasError={!!dateErrors.start}
                      />
                      <DateDisplay $hasError={!!dateErrors.start}>
                        {filters.startDate || '시작일'}
                      </DateDisplay>
                    </CustomDateInput>
                    {dateErrors.start && <ErrorMessage>{dateErrors.start}</ErrorMessage>}
                  </DateInputWrapper>
                  <DateSeparator />
                  <DateInputWrapper>
                    <CustomDateInput>
                      <DateInput
                        type="date"
                        value={filters.endDate ? filters.endDate.replace(/\./g, '-') : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('end', e.target.value)}
                        $hasError={!!dateErrors.end}
                      />
                      <DateDisplay $hasError={!!dateErrors.end}>
                        {filters.endDate || '종료일'}
                      </DateDisplay>
                    </CustomDateInput>
                    {dateErrors.end && <ErrorMessage>{dateErrors.end}</ErrorMessage>}
                  </DateInputWrapper>
                </DateInputs>

                <PeriodButtons>
                  <PeriodButton 
                    $active={activePeriodButton === "이번달"}
                    onClick={() => handlePeriodClick("이번달")}
                  >
                    이번달
                  </PeriodButton>
                  <PeriodButton 
                    $active={activePeriodButton === "3개월"}
                    onClick={() => handlePeriodClick("3개월")}
                  >
                    3개월
                  </PeriodButton>
                  <PeriodButton 
                    $active={activePeriodButton === "6개월"}
                    onClick={() => handlePeriodClick("6개월")}
                  >
                    6개월
                  </PeriodButton>
                </PeriodButtons>
              </FilterItem>
            </FilterDateRow>

            <FilterSelectRow>
              <FilterItem>
                <FilterLabel>글 상태</FilterLabel>
                <CustomSelectWrapper data-dropdown>
                  <CustomSelectButton 
                    onClick={() => {
                      setIsPostStatusOpen(prev => !prev);
                      setIsCategoryOpen(false);
                      setIsSearchTypeOpen(false);
                    }}
                    $isOpen={isPostStatusOpen}
                  >
                    <span>{filters.postStatus}</span>
                    <ArrowIcon src={isPostStatusOpen ? "/admin/img/icon_arrowUp.png" : "/admin/img/icon_arrowDown.png"} $isOpen={isPostStatusOpen}/>
                  </CustomSelectButton>
                  {isPostStatusOpen && (
                    <CustomDropdown>
                      <DropdownOption 
                        onClick={() => handlePostStatusChange("전체")}
                        $isSelected={filters.postStatus === "전체"}
                      >
                        전체
                      </DropdownOption>
                      <DropdownOption 
                        onClick={() => handlePostStatusChange("등록")}
                        $isSelected={filters.postStatus === "등록"}
                      >
                        등록
                      </DropdownOption>
                      <DropdownOption 
                        onClick={() => handlePostStatusChange("임시저장")}
                        $isSelected={filters.postStatus === "임시저장"}
                      >
                        임시저장
                      </DropdownOption>
                    </CustomDropdown>
                  )}
                </CustomSelectWrapper>
              </FilterItem>

              <FilterItem>
                <FilterLabel>카테고리</FilterLabel>
                <CustomSelectWrapper data-dropdown>
                  <CustomSelectButton 
                    onClick={() => {
                      setIsCategoryOpen(prev => !prev);
                      setIsPostStatusOpen(false);
                      setIsSearchTypeOpen(false);
                    }}
                    $isOpen={isCategoryOpen}
                  >
                    <span>{filters.category}</span>
                    <ArrowIcon src={isCategoryOpen ? "/admin/img/icon_arrowUp.png" : "/admin/img/icon_arrowDown.png"} $isOpen={isCategoryOpen}/>
                  </CustomSelectButton>
                  {isCategoryOpen && (
                    <CustomDropdown>
                      <DropdownOption 
                        onClick={() => handleCategoryChange("전체")}
                        $isSelected={filters.category === "전체"}
                      >
                        전체
                      </DropdownOption>
                      {categories.map(category => (
                        <DropdownOption 
                          key={category.category_id}
                          onClick={() => handleCategoryChange(category.name)}
                          $isSelected={filters.category === category.name}
                        >
                          {category.name}
                        </DropdownOption>
                      ))}
                    </CustomDropdown>
                  )}
                </CustomSelectWrapper>
              </FilterItem>

              <FilterItem>
                <FilterLabel>검색</FilterLabel>
                <CustomSelectWrapper data-dropdown>
                  <CustomSelectButton 
                    onClick={() => {
                      setIsSearchTypeOpen(prev => !prev);
                      setIsPostStatusOpen(false);
                      setIsCategoryOpen(false);
                    }}
                    $isOpen={isSearchTypeOpen}
                  >
                    <span>{filters.searchType}</span>
                    <ArrowIcon src={isSearchTypeOpen ? "/admin/img/icon_arrowUp.png" : "/admin/img/icon_arrowDown.png"} $isOpen={isSearchTypeOpen}/>
                  </CustomSelectButton>
                  {isSearchTypeOpen && (
                    <CustomDropdown>
                      <DropdownOption 
                        onClick={() => handleSearchTypeChange("전체")}
                        $isSelected={filters.searchType === "전체"}
                      >
                        전체
                      </DropdownOption>
                      <DropdownOption 
                        onClick={() => handleSearchTypeChange("제목")}
                        $isSelected={filters.searchType === "제목"}
                      >
                        제목
                      </DropdownOption>
                      <DropdownOption 
                        onClick={() => handleSearchTypeChange("내용")}
                        $isSelected={filters.searchType === "내용"}
                      >
                        내용
                      </DropdownOption>
                    </CustomDropdown>
                  )}
                </CustomSelectWrapper>
                <SearchContainer>
                  <SearchIcon src="/admin/img/icon_search.png" alt="search" />
                  <SearchInput
                    type="text"
                    placeholder="검색어를 입력하세요."
                    value={filters.searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </SearchContainer>
              </FilterItem>
            </FilterSelectRow>
            </SelectContainer>
          )}

          {isFilterExpanded && (
            <ButtonRow>
              <ResetButton onClick={handleReset}>초기화</ResetButton>
              <SearchButton onClick={handleSearch}>검색</SearchButton>
            </ButtonRow>
          )}
        </FilterSection>

        {/* 게시글 목록 */}
        <PostListSection>
          <PostListHeader>
            <div>
              <PostListTitle>게시글 목록</PostListTitle>
              <PostCount>총 <span>{filteredPosts.length}</span>개</PostCount>
            </div>
            <DeleteButton 
              disabled={selectedPosts.length === 0}
              $disabled={selectedPosts.length === 0}
              onClick={handleDeletePosts}
            >
              삭제
            </DeleteButton>
          </PostListHeader>

          <TableContainer>
            {/* 고정된 테이블 헤더 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell width="32px" style={{textAlign: "center", padding: "0"}}>
                    <Checkbox 
                      type="checkbox" 
                      checked={selectedPosts.length > 0 && selectedPosts.length === currentPosts.length}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
                    />
                  </TableHeaderCell>
                  <TableHeaderCell width="190px">게시글 번호</TableHeaderCell>
                  <TableHeaderCell width="180px">카테고리</TableHeaderCell>
                  <TableHeaderCell width="calc(100% - 1062px)">제목</TableHeaderCell>
                  <TableHeaderCell width="160px">상태</TableHeaderCell>
                  <TableHeaderCell width="160px">작성자</TableHeaderCell>
                  <TableHeaderCell width="160px">작성 일시</TableHeaderCell>
                  <TableHeaderCell width="180px">관리</TableHeaderCell>
                </TableRow>
              </TableHeader>
            </Table>
            
            {/* 스크롤 가능한 테이블 바디 */}
            <TableBodyContainer 
                $isFilterExpanded = {isFilterExpanded} 
                $notExistResult = {hasSearched && !currentPosts.length}>
              <Table>
                <TableBody>
                  {!hasSearched ? (
                    // 검색하지 않은 상태 - 빈 화면
                    <EmptyTableRow>
                      <TableCell>
                        {/* 빈 화면 - 필터 상태에 따라 높이 조정 */}
                      </TableCell>
                    </EmptyTableRow>
                  ) : currentPosts.length > 0 ? (
                    // 검색 결과가 있는 경우
                    currentPosts.map((post) => (
                      <TableRow key={post.post_id}>
                        <TableCell width="32px" style={{textAlign:"center" ,padding:"0"}}>
                          <Checkbox 
                            type="checkbox" 
                            checked={selectedPosts.includes(post.post_id)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePostSelect(post.post_id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell width="190px">
                          <TableText>{post.post_id}</TableText>
                        </TableCell>
                        <TableCell width="180px">
                          <TableText>{post.category.name}</TableText>
                        </TableCell>
                        <TableCell width="calc(100% - 1062px)">
                          <TableText>{post.title}</TableText>
                        </TableCell>
                        <TableCell width="160px">
                          <Badge 
                            $isTemp={post.content.state.state_id===2}
                            src={post.content.state.state_id === 2 ? "/admin/img/badge_temp.png" : "/admin/img/badge_active.png"} 
                            alt={post.content.state.name}
                          />
                        </TableCell>
                        <TableCell width="160px">
                          <TableText>{post.reg_user}</TableText>
                        </TableCell>
                        <TableCell width="160px">
                          <TableText>{new Date(post.regDate).toLocaleDateString('ko-KR')}</TableText>
                        </TableCell>
                        <TableCell width="180px" style={{marginRight:"-8px"}}>
                          <ChangeButton onClick={() => navigate(`/post/update/${post.post_id}`)}>수정</ChangeButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // 검색했지만 결과가 없는 경우
                    <EmptyTableRow>
                      <TableCell 
                        style={{ 
                          height: "100%", 
                          display:"flex", 
                          justifyContent:"center" , 
                          alignItems:"center",
                          fontFace:'Pretendard-SemiBold',
                          fontSize:"18px",
                          letterSpacing:"-0.024em",
                          color:colors.Gray[0] }}>
                        검색 결과가 존재하지 않습니다.
                      </TableCell>
                    </EmptyTableRow>
                  )}
                </TableBody>
              </Table>
            </TableBodyContainer>
          </TableContainer>
          
          <PageWrapper>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              noData={!hasSearched || filteredPosts.length === 0}
            />
          </PageWrapper>
        </PostListSection>
      </MainContent>
    </Container>
  );
};

export default Post;

// Styled Components
const Container = styled.div`
  width: 100%;
`;

const MainContent = styled.div`
  margin-top: -20px;           // header margin bottom 20 이 걸려있음
  width: 100%;
  padding: 0 32px;
`;

const FilterSection = styled.div`
  border: 1px solid ${colors.LightGray[400]};
  border-radius: 4px;
  padding: 16px 24px;
`;

const FilterHeader = styled.header`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`
const FilterTitle = styled.h3`
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  color: ${colors.Black};
`;

const FilterToggle= styled.div`
  display: flex;
  gap:4px;
  align-items: center;
  cursor: pointer;

  span{
    font-family: 'Pretendard-Medium';
    font-size: 15px;
    color:${colors.Black};
  }
  
  img{
    width: 16px;
    height: 16px;
  }
`

const SelectContainer = styled.div`
  margin-top: 30px;

  display: flex;
  flex-direction: column;
  gap:16px;

`
const FilterDateRow = styled.div`
  width: 100%;
`;

const FilterSelectRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
`;

const FilterItem = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
`;

const FilterLabel = styled.label`
  width: 88px;
  height: 36px;
  padding:7px 0;
  font-family: 'Pretendard-SemiBold';
  font-size: 14px;
  color: ${colors.Gray[0]};
`;

const DateInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DateInputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const CustomDateInput = styled.div`
  position: relative;
  width: 200px;
  height: 40px;
`;

const DateInput = styled.input<{ $hasError?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
  
  /* 달력 아이콘을 클릭할 수 있도록 */
  &::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }
`;

const DateDisplay = styled.div<{ $hasError?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color: ${props => {
    const text = props.children?.toString() || '';
    return text.includes('시작일') || text.includes('종료일') ? colors.Gray[200] : colors.Black;
  }};
  border: 1px solid ${props => props.$hasError ? '#ef4444' : colors.LightGray[300]};
  border-radius: 4px;
  background-color: ${colors.White};
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.2s ease;
  z-index: 1;

  &:hover {
    border-color: ${props => props.$hasError ? '#ef4444' : colors.Gray[0]};
  }
`;

const ErrorMessage = styled.span`
  position: absolute;
  top: 100%;
  left: 0;
  font-family: 'Pretendard-Regular';
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
  white-space: nowrap;
`;

const DateSeparator = styled.div`
  width: 12px;
  height: 1px;
  background-color: ${colors.Gray[0]};
`;

const PeriodButtons = styled.div`
  margin-left:16px;
  height: 100%;

  display: flex;
  align-items: center;
  gap: 16px;
`;

const PeriodButton = styled.button<{ $active: boolean }>`
  padding: 7px 0;
  width: 80px;
  height: 100%;
  text-align: center;
  border: 1px solid ${props => props.$active ? colors.Black : colors.LightGray[400]};
  border-radius: 4px;
  background-color: ${props => props.$active && colors.Black};
  color: ${props => props.$active ? colors.White : colors.Black};
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  cursor: pointer;
  
  /* &:hover {
    background-color: ${props => props.$active ? colors.Black : '#f3f4f6'};
  } */
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 200px;
  height: 40px;
`

const Select = styled.select`
  padding: 10px 40px 10px 12px;
  width: 100%;
  height: 100%;
  border: 1px solid ${colors.LightGray[400]};
  border-radius: 4px;
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color: ${colors.Black};
  background-color: ${colors.White};
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${colors.Gray[0]};
  }

  &:focus {
    border-color: ${colors.Black};
  }

  option {
    padding: 10px 12px;
    font-family: 'Pretendard-Regular';
    font-size: 14px;
    color: ${colors.Black};
    background-color: ${colors.White};
    border: none;
    outline: none;

    &:hover {
      background-color: ${colors.LightGray[0]};
    }

    &:checked {
      background-color: ${colors.LightGray[200]};
      color: ${colors.Black};
    }
  }
`;

const ArrowIcon = styled.img<{ $isOpen?: boolean }>`
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  pointer-events: none;

`

// 커스텀 드롭다운 스타일
const CustomSelectWrapper = styled.div`
  position: relative;
  width: 200px;
  height: 40px;
`;

const CustomSelectButton = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  height: 100%;
  padding: 0 12px;
  border: 1px solid ${colors.LightGray[400]};
  background-color: ${colors.White};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-family: 'Pretendard-Regular';
  font-size: 14px;

  &:hover {
    border-color: ${colors.Gray[0]};
  }

  &:focus {
    border-color: ${colors.Black};
  }
`;

const CustomDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 5px;
  background-color: ${colors.White};
  border: 1px solid ${colors.LightGray[300]};
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const DropdownOption = styled.div<{ $isSelected: boolean }>`
  padding: 10px 12px;
  height: 40px;
  cursor: pointer;
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color: ${colors.Black};
  background-color: ${props => props.$isSelected ? colors.LightGray[100] : 'transparent'};
  
  &:hover {
    background-color: ${colors.LightGray[100]};
  }
  
  &:first-child {
    border-radius: 4px 4px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 4px 4px;
  }
`;

const SearchContainer = styled.div`
  margin-left: 16px;
  position: relative;
  display: flex;
  align-items: center;
  gap:16px;
  width: 504px;
  height: 100%;
`;

const SearchInput = styled.input`
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  line-height: 1.4;

  &::placeholder{
    color: ${colors.Gray[200]};
  }

  width: 100%;
  height: 100%;
  padding: 10px 42px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
`;

const SearchIcon = styled.img`
  position: absolute;
  top: 12px;
  left: 16px;
  width: 16px;
  height: 16px;
  pointer-events: none;
`;

const ButtonRow = styled.div`
  margin-top: 30px;
  width: 100%;
  
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const ResetButton = styled.button`
  width: 80px;
  height: 40px;
  padding: 7px 0;

  border: 1px solid ${colors.LightGray[400]};
  border-radius: 4px;

  font-family: 'Pretendard-SemiBold';
  color: ${colors.Black};
  font-size: 16px;
  cursor: pointer;

`;

const SearchButton = styled(ResetButton)`
  background-color: ${colors.Black};
  color: ${colors.White};
`;

const PostListSection = styled.div`
  margin-top: 32px;
`;

const PostListHeader = styled.div`
  width: 100%;
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  div{
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const PostListTitle = styled.h3`
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  color: ${colors.Black};
`;

const PostCount = styled.span`
  font-family: 'Pretendard-Regular';
  font-size: 16px;
  color: ${colors.Gray[0]};

  span{
    font-family: 'Pretendard-SemiBold';
    color: ${colors.Black};
  }
`;


const DeleteButton = styled.button<{ $disabled?: boolean }>`
  width: 80px;
  height: 46px;
  padding: 10px 0;
  border: 1px solid ${props => props.$disabled ? '#e5e7eb' : '#d1d5db'};
  border-radius: 4px;
  background-color: ${props => props.$disabled ? '#f9fafb' : 'white'};
  color: ${props => props.$disabled ? '#9ca3af' : colors.Black};
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  cursor: ${props => props.$disabled ? 'auto' : 'pointer'};
  
  &:hover {
    background-color: ${props => props.$disabled ? '#f9fafb' : '#f3f4f6'};
  }
`;

const TableContainer = styled.div`
  width: 100%;
  /* border: 1px solid ${colors.LightGray[300]}; */
`;

const TableBodyContainer = styled.div<{ $isFilterExpanded: boolean; $notExistResult:boolean; }>`
  width: 100%;
  height: ${props => props.$isFilterExpanded ? "328px" : "616px"};
  overflow-y: auto;
  scrollbar-width: none;
  box-sizing: border-box;

  ${props=> props.$notExistResult && `
    display: flex;
    align-items: center;
    justify-content: center;
  `}
`;

const Table = styled.table`
  width: 100%;
  //height 100% 넣으면 게시물 1개일 때 높이 다 먹음
  border-collapse: collapse;
`
;

const TableHeader = styled.thead`
  background-color: ${colors.LightGray[0]};
  border-top: 1px solid ${colors.LightGray[300]};
  border-bottom: 1px solid ${colors.LightGray[300]};
`;

const TableRow = styled.tr`
  height: 56px;
`;

const EmptyTableRow = styled.tr`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family:'Pretendard-SemiBold';
  font-size:"18px";
  letter-spacing:"-0.024em";
  color:${colors.Gray[0]};
`;

const TableHeaderCell = styled.th<{ width?: string }>`
  padding: 17px 0 17px 16px;
  font-family: 'Pretendard-SemiBold';
  font-size: 14px;
  color: ${colors.Black};
  width: ${props => props.width};
  position: relative;
  text-align: left;
  
  &::before{
    content:"";
    position: absolute;
    width: 1.2px;
    height: 26px;
    top:calc(50% - 13px);
    left:0;
    
    background-color:${colors.LightGray[300]};
  }
  &:first-child {
    &::before{
      content: none;
    }
  }
`;

const TableBody = styled.tbody`
  height: 100%;
`;

const TableCell = styled.td<{width?:string}>`
  width: ${props => props.width};
  padding: 17px 0 17px 16px;
  height: 56px;
`;

const Badge = styled.img<{$isTemp:boolean}>`
  width: ${props=>props.$isTemp ? `68px`:`47px`};
  height: 21px;
`

const ChangeButton = styled.button`
  background-color: ${colors.White};
  color: ${colors.Black};
  text-align: center;
  width: 80px;
  height: 40px;
  border: 1px solid ${colors.LightGray[400]};
  border-radius: 4px;
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  cursor: pointer;
`;

const TableText = styled.span`
  font-family: 'Pretendard-Regular';
  font-size: 14px;
  color: ${colors.Black};
  line-height: 1.6;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin:0;
  appearance: none;
  background: url('/img/checkbox_off.png') no-repeat center / contain;

  &:checked {
    background-image: url('/img/checkbox_on.png');
  }
`

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 82px;
  div{
    &:first-child{
      margin: 0;    //Pagination 컴포넌트 margintop이 40으로 설정돼있음 
    }
  }        
`
const GoToCreate = styled.button`
  background-color: ${colors.Black};
  width: 80px;
  padding: 10px 0;
  font-family: 'Pretendard-SemiBold';
  font-size: 16px;
  color: ${colors.White};
  border-radius: 4px;
  border: none;
  cursor: pointer;
`;