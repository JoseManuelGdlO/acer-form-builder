import { useFormStore } from '@/hooks/useFormStore';
import { FormList } from '@/components/forms/FormList';
import { FormEditor } from '@/components/forms/FormEditor';

const Index = () => {
  const {
    forms,
    currentForm,
    createForm,
    updateForm,
    deleteForm,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    selectForm,
  } = useFormStore();

  if (currentForm) {
    return (
      <FormEditor
        form={currentForm}
        onBack={() => selectForm(null)}
        onUpdateForm={updates => updateForm(currentForm.id, updates)}
        onAddQuestion={type => addQuestion(currentForm.id, type)}
        onUpdateQuestion={(questionId, updates) =>
          updateQuestion(currentForm.id, questionId, updates)
        }
        onDeleteQuestion={questionId => deleteQuestion(currentForm.id, questionId)}
        onReorderQuestions={questions => reorderQuestions(currentForm.id, questions)}
      />
    );
  }

  return (
    <FormList
      forms={forms}
      onSelectForm={selectForm}
      onCreateForm={createForm}
      onDeleteForm={deleteForm}
    />
  );
};

export default Index;
