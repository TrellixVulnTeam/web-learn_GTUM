import express from 'express';
import User from '../models/User';
import { sendResetPasswordEmail } from '../mailer';
import jwt from 'jsonwebtoken';
import decode from 'jwt-decode';
import { sendChangeAlert } from '../mailer';

const router = express.Router();

router.post('/', (req, res) => {
    const { credentials } = req.body;
    User.findOne({ email: credentials.email }).then(user => {
        if(user && user.isValidPassword(credentials.password)){
            res.json({user: user.toAuthJSON()})
        }else{
            res.status(400).json({
                errors: { global: 'Communicating with database failed... :('}
            });
        }
    });
});

router.post('/confirmation', (req, res) => {
    const token = req.body.token;
    User.findOneAndUpdate({ confirmationToken: token}, {confirmationToken: "", confirmed: true}, {new: true})
        .then( user => user ? res.json({ user: user.toAuthJSON() }) : res.status(400).json({}))
})

router.post('/reset_password_request', (req, res) => {
    User.findOne({ email: req.body.email }).then(user => {
        if(user){
            sendResetPasswordEmail(user);
            res.json({});
        }else{
            res.status(400).json({ errors: { global: "There is no such email in our database!"}})
        }
    })
})

router.post('/validate_token', (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, err => {
        if(err){
            res.status(401).json({})
        }else{
            res.json({});
        }
    })
});

router.post('/reset_password', (req, res) => {
    const { password, token } = req.body.data;
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
        if(err){
            res.send(401).json({ errors: { global: "Invalid token!"}});
        }else{
            User.findOne({_id: decode._id}).then( user => {
                if(user){
                    user.setPassword(password);
                    user.save().then(user => {
                        sendChangeAlert(user); //When user changed the password, send email
                        res.json({});
                    })
                }else{
                    res.status(404).json({ errors: { global: "Invalid token!"}});
                }
            });
        }
    });
})


export default router;