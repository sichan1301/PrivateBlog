import styled from "styled-components";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Header from "../components/header/header";
import { colors } from "../common/designSystem";
import ErrorModal from "../components/errorModal/errorModal";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Category {
  category_id: number;
  name: string;
  reg_user: string;
  mod_user: string;
  sort: number;
  post_count?: number;
  isModified?: boolean;
}

interface Post {
  category: {
    category_id: number;
    name: string;
    reg_user: string;
    mod_user: string;
    sort: number;
  };
}

const Category = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal,setShowErrorModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedCategoryName, setEditedCategoryName] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [originalCategoryName, setOriginalCategoryName] = useState("");
  const [tempIdCounter, setTempIdCounter] = useState(0);
  const [categoryErrors, setCategoryErrors] = useState<{[key: number]: string}>({});
  const [modifiedCategories, setModifiedCategories] = useState<{[key: number]: boolean}>({});
  const [leftPanelHeight, setLeftPanelHeight] = useState<number>(336);
  const leftPanelRef = useRef<HTMLDivElement>(null); 

  const API_URL = "";

  const updateLeftPanelHeight = () => {
    if (leftPanelRef.current) {
      const height = leftPanelRef.current.offsetHeight;
      setLeftPanelHeight(height);
    }
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setError(null);
  };

  const generateTempId = () => {
    const newTempId = tempIdCounter - 1; // 임시 ID 생성 (음수)
    setTempIdCounter(newTempId);
    return newTempId;
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/client/post/select/all`);
      setPosts(response.data || []);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
    }
  };

  const getPostCountByCategory = (categoryId: number): number => {
    return posts.filter(post => post.category.category_id === categoryId).length;
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/client/category/select/all`);
      const categoriesData = response.data || [];
      
      const categoriesWithPostCount = categoriesData.map((category: Category) => ({
        ...category,
        post_count: getPostCountByCategory(category.category_id)
      }));
      
      setCategories(categoriesWithPostCount);
    } catch (err) {
      console.error("카테고리 로드 실패:", err);
      setError("카테고리를 불러오는데 실패했습니다.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async () => {
    if (categories.length >= 10) {
      setError("최대 카테고리 한도 수를 넘었습니다.");
      setShowErrorModal(true);
      return;
    }

    setIsAddingCategory(true);
    setError(null);

    try {
      const newCategory = {
        category_id: generateTempId(),
        name: "새로운 카테고리",
        reg_user: localStorage.getItem('@user_name') || 'admin',
        mod_user: localStorage.getItem('@user_name') || 'admin',
        sort: categories.length + 1
      };

      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      setHasChanges(true);
      
      // 새 카테고리를 수정 상태로 설정
      setModifiedCategories(prev => ({
        ...prev,
        [newCategory.category_id]: true
      }));
    
      setSelectedCategory(newCategory);
      setEditedCategoryName("새로운 카테고리");
      setOriginalCategoryName("새로운 카테고리");
    } catch (err) {
      console.error("카테고리 추가 실패:", err);
      setError("카테고리 추가에 실패했습니다.");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleCategoryNameChange = (newName: string) => {
    setEditedCategoryName(newName);
    
    if (!selectedCategory) return;
    
    // 유효성 검사
    if (newName.length > 15) {
      const errorMsg = "제한 글자수를 초과하였습니다.";
      setFieldError(errorMsg);
      setCategoryErrors(prev => ({
        ...prev,
        [selectedCategory.category_id]: errorMsg
      }));
      return;
    }
    
    if (newName.trim() === "") {
      const errorMsg = "필수 항목을 입력하세요.";
      setFieldError(errorMsg);
      setCategoryErrors(prev => ({
        ...prev,
        [selectedCategory.category_id]: errorMsg
      }));
      return;
    }
    
    // 유효한 입력일 때 에러 초기화
    setFieldError(null);
    setCategoryErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[selectedCategory.category_id];
      return newErrors;
    });
    
    // 카테고리 목록을 즉시 업데이트
    const updatedCategories = categories.map(cat => 
      cat.category_id === selectedCategory.category_id 
        ? { ...cat, name: newName, isModified: newName !== originalCategoryName }
        : cat
    );
    setCategories(updatedCategories);
    
    // 선택된 카테고리도 업데이트
    const updatedSelectedCategory = { ...selectedCategory, name: newName };
    setSelectedCategory(updatedSelectedCategory);
    
    if (newName !== originalCategoryName) {
      // 수정 상태를 별도로 관리
      setModifiedCategories(prev => ({
        ...prev,
        [selectedCategory.category_id]: true
      }));
      setHasChanges(true);
    } else {
      // 원래 이름과 같으면 수정 상태 해제
      setModifiedCategories(prev => {
        const newModified = { ...prev };
        delete newModified[selectedCategory.category_id];
        return newModified;
      });
      
      // 모든 카테고리가 원래 상태로 돌아갔는지 확인
      const hasAnyChanges = Object.keys(modifiedCategories).length > 0;
      setHasChanges(hasAnyChanges);
    }
  };

  const saveAllCategories = async () => {
    if (!hasChanges) {
      alert("변경사항이 없습니다.");
      return;
    }

    const emptyCategories = categories.filter(cat => !cat.name.trim());
    if (emptyCategories.length > 0) {
      const firstEmptyCategory = emptyCategories[0];
      setSelectedCategory(firstEmptyCategory);
      setEditedCategoryName(firstEmptyCategory.name);
      setOriginalCategoryName(firstEmptyCategory.name);
      setFieldError("필수 항목을 입력하세요.");
      setCategoryErrors(prev => ({
        ...prev,
        [firstEmptyCategory.category_id]: "필수 항목을 입력하세요."
      }));
      return;
    }

    const longNameCategories = categories.filter(cat => cat.name.length > 15);
    if (longNameCategories.length > 0) {
      const firstLongNameCategory = longNameCategories[0];
      setSelectedCategory(firstLongNameCategory);
      setEditedCategoryName(firstLongNameCategory.name);
      setOriginalCategoryName(firstLongNameCategory.name);
      setFieldError("제한 글자수를 초과하였습니다.");
      setCategoryErrors(prev => ({
        ...prev,
        [firstLongNameCategory.category_id]: "제한 글자수를 초과하였습니다."
      }));
      return;
    }

    setIsSaving(true);
    setError(null);
    setFieldError(null);

    try {
      const existingCategories = categories.filter(cat => cat.category_id > 0);
      const newCategories = categories.filter(cat => cat.category_id < 0);

      let allSuccess = true;
      if (existingCategories.length > 0) {
        try {
          const updateResponse = await axios.put(`${API_URL}/api/admin/categorys/update`, existingCategories);
          if (updateResponse.status !== 200) {
            allSuccess = false;
          }
        } catch (updateErr) {
          console.error("카테고리 수정 실패:", updateErr);
          allSuccess = false;
        }
      }

      if (newCategories.length > 0 && allSuccess) {
        try {
          const categoriesForInsert = newCategories.map(cat => ({
            ...cat,
            category_id: 0
          }));
          const insertResponse = await axios.post(`${API_URL}/api/admin/categorys/insert`, categoriesForInsert);
          if (insertResponse.status !== 200) {
            allSuccess = false;
          }
        } catch (insertErr) {
          console.error("카테고리 추가 실패:", insertErr);
          allSuccess = false;
        }
      }

      if (allSuccess) {
        setHasChanges(false);
        const resetCategories = categories.map(cat => ({ ...cat, isModified: false }));
        setCategories(resetCategories);
        setCategoryErrors({}); // 에러 상태 초기화
        setModifiedCategories({}); // 수정 상태 초기화
        await fetchPosts();
        await fetchCategories();
        alert("카테고리가 저장되었습니다.");
      } else {
        setError("카테고리 저장에 실패했습니다.");
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error("카테고리 저장 실패:", err);
      setError("카테고리 저장에 실패했습니다.");
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!selectedCategory) {
      setError("삭제할 카테고리를 선택해주세요.");
      return;
    }

    if (selectedCategory.post_count && selectedCategory.post_count > 0) {
      setError("게시글이 있는 카테고리는 삭제할 수 없습니다.");
      setShowErrorModal(true);
      return;
    }

    if (!confirm("선택한 카테고리를 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      if (selectedCategory.category_id < 0) {
        const remainingCategories = categories.filter(cat => cat.category_id !== selectedCategory.category_id);
        setCategories(remainingCategories);
        setSelectedCategory(null);
        setHasChanges(true);
        alert("카테고리가 삭제되었습니다.");
      } else {
          const deleteResponse = await axios.delete(`${API_URL}/api/admin/category/delete/${selectedCategory.category_id}`);
        
        if (deleteResponse.status === 200) {
          const remainingCategories = categories.filter(cat => cat.category_id !== selectedCategory.category_id);
          setCategories(remainingCategories);
          setSelectedCategory(null);
          await fetchPosts();
          await fetchCategories();
          alert("카테고리가 삭제되었습니다.");
        }
      }
    } catch (err) {
      console.error("카테고리 삭제 실패:", err);
      setError("카테고리 삭제에 실패했습니다.");
      setShowErrorModal(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    // 카테고리 목록에서 현재 선택된 카테고리의 이름을 가져옴 (실시간 업데이트된 이름)
    const currentCategory = categories.find(cat => cat.category_id === category.category_id);
    const currentName = currentCategory ? currentCategory.name : category.name;
    
    setSelectedCategory({ ...category, name: currentName });
    setEditedCategoryName(currentName);
    setOriginalCategoryName(currentName);
    
    // 해당 카테고리의 에러 상태 복원
    const categoryError = categoryErrors[category.category_id];
    setFieldError(categoryError || null);
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    const newCategories = Array.from(categories);
    const [reorderedItem] = newCategories.splice(sourceIndex, 1);
    newCategories.splice(destinationIndex, 0, reorderedItem);

    // sort 값 업데이트
    const updatedCategories = newCategories.map((category, index) => ({
      ...category,
      sort: index + 1
    }));

    setCategories(updatedCategories);
    setHasChanges(true);
  }, [categories]);

  useEffect(() => {
    const loadData = async () => {
      await fetchPosts();
      await fetchCategories();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      fetchCategories();
    }
  }, [posts]);

  useEffect(() => {
    updateLeftPanelHeight();
  }, [categories]);

  useEffect(() => {
    const handleResize = () => {
      updateLeftPanelHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Container>
      <Header title="카테고리">
        <SaveButton onClick={saveAllCategories} disabled={!hasChanges || isSaving}>
          {isSaving ? "저장 중..." : "저장"}
        </SaveButton>
      </Header>
 
      <MainContent>
        <ActionButtons>
          <AddButton 
            onClick={addCategory} 
            disabled={isAddingCategory || categories.length >= 10}
          >
            {isAddingCategory ? "추가 중..." : "추가"}
          </AddButton>
          <DeleteButton 
            onClick={deleteCategory} 
            disabled={!selectedCategory || isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </DeleteButton>
        </ActionButtons>


        <PannelWrapper>

          <LeftPanel ref={leftPanelRef}>
            <CategoryListHeader>카테고리 전체 <span>{categories.length}</span></CategoryListHeader>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories" type="categories">
                {(provided) => (
                  <CategoryList ref={provided.innerRef} {...provided.droppableProps}>
                    {isLoading ? (
                      <LoadingMessage>카테고리를 불러오는 중...</LoadingMessage>
                    ) : (
                      categories.map((category, index) => (
                        <Draggable key={category.category_id} draggableId={category.category_id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <CategoryItem
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              $isSelected={selectedCategory?.category_id === category.category_id}
                              $isModified={category.isModified}
                              $isDragging={snapshot.isDragging}
                              onClick={() => handleCategorySelect(category)}
                            >
                              <DragHandle {...provided.dragHandleProps}>⋮⋮</DragHandle>
                              <CategoryWrapper>
                                <CategoryName $isModified={modifiedCategories[category.category_id]}>{category.name}</CategoryName>
                                <CategoryCount>{category.post_count || 0}</CategoryCount>
                              </CategoryWrapper>
                            </CategoryItem>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </CategoryList>
                )}
              </Droppable>
            </DragDropContext>
          </LeftPanel>

          {selectedCategory ? (
            <RightPanel $height={leftPanelHeight}>
                <RightHeader>카테고리 정보</RightHeader>               
                <CategoryInfoForm>
                  <InfoField style={{position:"relative"}}>
                    <Label>카테고리명</Label>
                    <InfoInput
                      value={editedCategoryName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCategoryNameChange(e.target.value)}
                      placeholder="카테고리명을 입력해 주세요."
                      $hasError={!!fieldError}
                    />
                    {fieldError && (
                      <FieldErrorMessage>{fieldError}</FieldErrorMessage>
                    )}
                  </InfoField>
                  <InfoField>
                    <Label>게시글 수</Label>
                    <InfoValue><span>{selectedCategory.post_count || 0}</span> 개</InfoValue>
                  </InfoField>
                </CategoryInfoForm>
            </RightPanel>)
          :<div style={{width:"calc(50% - 16px)", height: leftPanelHeight}} />}
        </PannelWrapper>
      </MainContent>

       {error && showErrorModal && (
         <ErrorModal title="오류" text={error} onClose={handleCloseErrorModal} />
       )}
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
`;

const SaveButton = styled.button<{disabled:boolean}>`
  padding: 10px 0;
  width: 80px;
  height: 46px;
  
  color: ${props=>props.disabled?colors.White :colors.White};
  background: ${ props=>props.disabled? colors.LightGray[300]:colors.Black};

  border-radius: 4px;
  font-family: "Pretendard-SemioBold";
  font-size: 16px;
  border: none;
  cursor: ${props => props.disabled ? 'auto' : 'pointer'};

`;

const MainContent = styled.div`
  height: calc(100vh - 200px);
  padding:20px 32px;
`;


const ActionButtons = styled.div`
  width: calc(50% - 16px);
  display: flex;
  justify-content: end;
  gap: 15px;
`;

const AddButton = styled(SaveButton)`
  color: ${colors.Black};
  background: ${colors.White};
  border: 1px solid ${colors.LightGray[400]};
`;

const DeleteButton = styled(AddButton)<{disabled:boolean}>`
  color: ${props=>props.disabled?colors.White :colors.White};
  background: ${ props=>props.disabled? colors.LightGray[300]:colors.Black};
  border: none;
`;

const PannelWrapper = styled.div`
  margin-top: 12px;
  width: 100%;
  display: flex;
  gap:32px;
`
const LeftPanel = styled.div`
  flex:1;
  max-width: calc(50% - 16px);
  height:auto;
`;

const CategoryListHeader = styled.div`
  display: flex;
  align-items: center;
  gap:8px;

  width: 100%;
  height: 56px;

  font-family: "Pretendard-SemioBold";
  font-size: 16px;
  color: ${colors.Black};
  background-color: ${colors.LightGray[0]};
  padding: 13.8px 70px;

  border-top: 1px solid ${colors.LightGray[300]};
  position: relative;
  
  span{
    font-size: 14px;
    color: ${colors.Gray[0]};
    line-height: 1.6;
  }

  &::before{
    content:"";
    position: absolute;
    width: 1.2px;
    height: 26px;
    top:calc(50% - 13px);
    left:50.4px;
    
    background-color:${colors.LightGray[300]};
  }
`;

const CategoryList = styled.div`
  width: 100%;

  &:first-child{
    border-top: 1px solid ${colors.LightGray[300]};
  }
`;

const CategoryItem = styled.div<{ $isSelected: boolean; $isModified?: boolean; $isDragging?: boolean }>`
  width: 100%;
  height: 56px;
  display: flex;
  background: ${props => {
    if (props.$isDragging) return colors.LightGray[100]; // 드래그 중일 때 회색 배경
    if (props.$isModified) return '#f3f4f6'; // 수정된 카테고리는 회색 배경
    return props.$isSelected ? colors.LightGray[100] : '#fff';
  }};
  border-bottom: 1px solid ${props => props.$isSelected ? '#d1d5db' : colors.LightGray[300]};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: ${props => props.$isDragging ? 0.8 : 1};
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50.4px;
  height: 100%;
  color: ${colors.Gray[100]};
  cursor: grab;
  user-select: none;
  touch-action: none;
  
  &:active {
    cursor: grabbing;
  }
`;

const CategoryWrapper = styled.div`
  width: calc(100% - 50.4px);
  height: 100%;
  display: flex;
  align-items: center;
  gap:8px;
  padding:15.6px 19.2px;
`
const CategoryName = styled.span<{ $isModified?: boolean }>`
  font-family: "Pretendard-Medium";
  font-size: 16px;
  line-height: 1.6;
  color: ${props => props.$isModified ? colors.Gray[200] :colors.Black};
`;

const CategoryCount = styled.span`
  font-family: "Pretendard-Medium";
  font-size: 14px;
  line-height: 1.6;
  color: ${colors.Gray[0]};
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 14px;
`;


const RightPanel = styled.div<{ $height: number }>`
  flex:1;
  max-width: calc(50% - 16px);
  height: ${props => props.$height}px;
  border: 1px solid ${colors.LightGray[300]};
  border-radius: 4px;
  padding: 20px 32px;
`;


const RightHeader = styled.header`
  width: 100%;
  font-family: "Pretendard-SemiBold";
  font-size: 16px;
  line-height: 1.6;
`

const CategoryInfoForm = styled.div`
  margin-top: 36px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InfoField = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Label = styled.label`
  padding: 7px 0;
  width: 88px;
  font-family: "Pretendard-SemiBold";
  font-size: 16px;
  color: ${colors.Gray[0]};
`;

const InfoInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  height: 40px;
  
  padding: 9px 16px;
  
  border: 1px solid ${props => props.$hasError ? colors.Error : colors.LightGray[400]};
  border-radius: 4px;
  
  font-family: "Pretendard-Regular";
  font-size: 14px;
  color: ${colors.Black};

  &::placeholder{
    color: ${colors.Gray[200]};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? colors.Error : colors.Black};
  }
`;

const InfoValue = styled.div`
  width: 100%;
  height: 20px;

  display: flex;
  align-items: center;

  font-family: "Pretendard-Regular";
  font-size: 14px;
  color: ${colors.Gray[0]};

  span{
    color: ${colors.Black};
  }
`;

const NoSelectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  flex: 1;
  min-height: 300px;
`;

const NoSelectionIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
`;

const NoSelectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const NoSelectionDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
`;

const FieldErrorMessage = styled.div`
  position: absolute;
  bottom:-5px;
  left:102px;        
  transform: translateY(100%);
  font-family: "Pretendard-Regular";
  font-size: 10px;
  color: ${colors.Error};

`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const AddCategoryForm = styled.div`
  margin-bottom: 24px;
`;

const Input = styled.input`
  width: 100%;
  max-width: 400px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #1b7eff;
  }
`;

export default Category;
