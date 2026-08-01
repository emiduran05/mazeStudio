const service = require("../services/marketplaceService");
async function catalog(req,res,next){try{res.json({offerings:await service.catalog(req.query)})}catch(e){next(e)}}
async function detail(req,res,next){try{res.json(await service.detail(req.params.journeyId,req.user?.id||null))}catch(e){next(e)}}
async function previewStep(req,res,next){try{res.json({step:await service.previewStep(req.params.journeyId,req.params.stepId)})}catch(e){next(e)}}
async function enroll(req,res,next){try{res.status(201).json(await service.beginEnrollment(req.user,req.params.offeringId,req.body.cohortId||null,req.body.booking||{}))}catch(e){next(e)}}
async function confirm(req,res,next){try{res.json(await service.confirm(req.user.id,req.body.sessionId))}catch(e){next(e)}}
async function availability(req,res,next){try{res.json(await service.availability(req.params.offeringId,req.query))}catch(e){next(e)}}
async function subscriptions(req,res,next){try{res.json({subscriptions:await service.subscriptions(req.user.id)})}catch(e){next(e)}}
async function orders(req,res,next){try{res.json({orders:await service.orders(req.user.id)})}catch(e){next(e)}}
async function cancelSubscription(req,res,next){try{res.json(await service.cancelSubscription(req.user.id,req.params.subscriptionId))}catch(e){next(e)}}
module.exports={catalog,detail,previewStep,enroll,confirm,availability,subscriptions,orders,cancelSubscription};
