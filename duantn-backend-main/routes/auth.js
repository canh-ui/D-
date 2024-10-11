const jwt = require('jsonwebtoken');

router.post('/login', async (request, response) => {
    const user = await User.findOne({email: request.body.email});
    if (!user) return response.status(422).send('Email or Password is not correct');

    if (!checkPassword) return response.status(422).send('Email or Password is not correct');

    const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET, { expiresIn: 60 * 60 * 24 });
    response.header('auth-token', token).send(token);
})