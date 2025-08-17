document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('nav ul li a');
    const dictionaryContainer = document.getElementById('dictionary-container');
    const flashcardContainer = document.getElementById('flashcard-container');
    const tabs = document.querySelectorAll('.tab-button');
    const searchInput = document.getElementById('searchInput');

    const topicSelect = document.getElementById('topic-select');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const quizContainer = document.getElementById('quiz-container');
    const quizQuestion = document.getElementById('quiz-question');
    const quizAnswers = document.getElementById('quiz-answers');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizResults = document.getElementById('quiz-results');
    const correctCount = document.getElementById('correct-count');
    const incorrectCount = document.getElementById('incorrect-count');
    const reviewWrongBtn = document.getElementById('review-wrong-btn');
    const reviewWrongContainer = document.getElementById('review-wrong-container');
    const wrongAnswersList = document.getElementById('wrong-answers-list');
    
    const correctRatioChartCtx = document.getElementById('correct-ratio-chart').getContext('2d');
    const mostMissedWordsList = document.getElementById('most-missed-words');

    let currentQuiz = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let wrongAnswerLog = [];
    
    // Lưu trữ và lấy dữ liệu thống kê từ LocalStorage
    let quizStats = JSON.parse(localStorage.getItem('quizStats')) || {};
    let myChart;

    // Chuyển trang
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = document.querySelector(e.target.getAttribute('href'));
            
            pages.forEach(page => page.classList.remove('active'));
            targetPage.classList.add('active');
            
            if (e.target.getAttribute('href') === '#stats') {
                renderStats();
            }
        });
    });

    // Hiển thị từ điển
    const renderDictionary = (data) => {
        dictionaryContainer.innerHTML = '';
        for (const topic in data) {
            const topicSection = document.createElement('div');
            topicSection.innerHTML = `<h3 class="topic-title">${topic}</h3>`;
            const wordGrid = document.createElement('div');
            wordGrid.classList.add('word-grid');
            data[topic].forEach(word => {
                const wordItem = document.createElement('div');
                wordItem.classList.add('word-item');
                wordItem.innerHTML = `
                    <p><strong>Hán Việt:</strong> ${word.hanViet}</p>
<p><strong>Tiếng Trung:</strong> ${word.hanzi} (${word.pinyin})</p>
                    <p><strong>Tiếng Việt:</strong> ${word.vietnamese}</p>
                    <p><strong>Ví dụ:</strong> ${word.example}</p>
                `;
                wordGrid.appendChild(wordItem);
            });
            topicSection.appendChild(wordGrid);
            dictionaryContainer.appendChild(topicSection);
        }
    };

    // Hiển thị Flashcards
    const renderFlashcards = (data) => {
        flashcardContainer.innerHTML = '';
        for (const topic in data) {
            const topicSection = document.createElement('div');
            topicSection.innerHTML = `<h3 class="topic-title">${topic}</h3>`;
            const flashcardGrid = document.createElement('div');
            flashcardGrid.style.display = 'grid';
            flashcardGrid.style.gap = '20px';
            flashcardGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
            
            data[topic].forEach(word => {
                const flashcard = document.createElement('div');
                flashcard.classList.add('flashcard');
                flashcard.innerHTML = `
                    <div class="card-face card-front">
                        <p>${word.hanzi} - ${word.hanViet}</p>
                    </div>
                    <div class="card-face card-back">
                        <p>${word.pinyin}</p>
                        <p>${word.vietnamese}</p>
                    </div>
                `;
                flashcard.addEventListener('click', () => {
                    flashcard.classList.toggle('flipped');
                });
                flashcardGrid.appendChild(flashcard);
            });
            topicSection.appendChild(flashcardGrid);
            flashcardContainer.appendChild(topicSection);
        }
    };

    // Chuyển tab Từ điển/Flashcards
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTabId = tab.getAttribute('data-tab');
            document.getElementById(`${targetTabId}-tab`).classList.add('active');
            
            if (targetTabId === 'dictionary') {
                renderDictionary(wordData);
            } else {
                renderFlashcards(wordData);
            }
        });
    });

    // Tìm kiếm
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredData = {};
        for (const topic in wordData) {
            const filteredWords = wordData[topic].filter(word => 
                word.hanViet.toLowerCase().includes(query) ||
                word.pinyin.toLowerCase().includes(query) ||
word.hanzi.toLowerCase().includes(query) ||
                word.vietnamese.toLowerCase().includes(query)
            );
            if (filteredWords.length > 0) {
                filteredData[topic] = filteredWords;
            }
        }
        renderDictionary(filteredData);
    });

    // Ôn tập
    const populateTopicSelect = () => {
        for (const topic in wordData) {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        }
    };

    startQuizBtn.addEventListener('click', () => {
        const selectedTopic = topicSelect.value;
        currentQuiz = shuffleArray(wordData[selectedTopic]);
        currentQuestionIndex = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;
        wrongAnswerLog = [];
        
        document.getElementById('quiz-options').style.display = 'none';
        quizResults.style.display = 'none';
        reviewWrongContainer.style.display = 'none';
        quizContainer.style.display = 'block';
        
        loadQuestion();
    });

    const loadQuestion = () => {
        if (currentQuestionIndex >= currentQuiz.length) {
            endQuiz();
            return;
        }

        const currentWord = currentQuiz[currentQuestionIndex];
        const questionText = `Đoán từ Hán Việt/Tiếng Việt của: "${currentWord.hanzi}" (${currentWord.pinyin}) trong ngữ cảnh: "${currentWord.example}"`;
        quizQuestion.innerHTML = questionText;
        
        quizAnswers.innerHTML = '';
        quizFeedback.textContent = '';
        const allWords = Object.values(wordData).flat();
        const choices = generateChoices(currentWord, allWords);
        
        choices.forEach(choice => {
            const answerOption = document.createElement('div');
            answerOption.classList.add('answer-option');
            answerOption.innerHTML = `${choice.hanViet} - ${choice.vietnamese}`;
            answerOption.addEventListener('click', () => handleAnswer(choice, currentWord, answerOption));
            quizAnswers.appendChild(answerOption);
        });
    };

    const generateChoices = (correctWord, allWords) => {
        const choices = [correctWord];
        const otherWords = allWords.filter(w => w.hanzi !== correctWord.hanzi);
        const shuffledOthers = shuffleArray(otherWords).slice(0, 3);
        
        return shuffleArray(choices.concat(shuffledOthers));
    };

    const handleAnswer = (selected, correct, element) => {
        const isCorrect = selected.hanzi === correct.hanzi;
        
        if (!quizStats[correct.hanzi]) {
            quizStats[correct.hanzi] = { correct: 0, incorrect: 0 };
        }
        
        if (isCorrect) {
            element.classList.add('correct');
            quizFeedback.innerHTML = '✅ Chính xác!';
            correctAnswers++;
            quizStats[correct.hanzi].correct++;
} else {
            element.classList.add('incorrect');
            quizFeedback.innerHTML = `❌ Sai rồi. Đáp án đúng là: <strong>${correct.hanViet}</strong> - ${correct.vietnamese}`;
            incorrectAnswers++;
            quizStats[correct.hanzi].incorrect++;
            wrongAnswerLog.push(correct);
        }

        Array.from(quizAnswers.children).forEach(child => child.style.pointerEvents = 'none');
        
        localStorage.setItem('quizStats', JSON.stringify(quizStats));
        
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
        }, 3000);
    };

    const endQuiz = () => {
        quizContainer.style.display = 'none';
        quizResults.style.display = 'block';
        correctCount.textContent = `Số câu đúng: ${correctAnswers}`;
        incorrectCount.textContent = `Số câu sai: ${incorrectAnswers}`;
        
        document.getElementById('quiz-options').style.display = 'block';
    };

    reviewWrongBtn.addEventListener('click', () => {
        quizResults.style.display = 'none';
        reviewWrongContainer.style.display = 'block';
        wrongAnswe