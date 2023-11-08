function generateCongratulations(userName, userAge) {
    // Создаем массив с разными вариантами поздравлений
    const congratulationsMessages = [
        `Поздравляем, ${userName}! С днем рождения! Теперь вам ${userAge} лет.,`
        `С днем рождения, ${userName}! Пусть этот день будет наполнен радостью и счастьем. Вам сегодня исполняется ${userAge} лет!,`
        `${userName}, с днем рождения! Ваш возраст теперь равен ${userAge}. Пусть каждый день вашей жизни будет особенным!,`
        `С праздником, ${userName}! На сей раз вы отмечаете ${userAge} лет. Пусть ваши дни будут полны радости и удовольствия.,`
    ];

    // Генерируем случайное число, чтобы выбрать одно из поздравлений
    const randomIndex = Math.floor(Math.random() * congratulationsMessages.length);

    // Возвращаем выбранное поздравление
    return congratulationsMessages[randomIndex];
}

export default generateCongratulations()