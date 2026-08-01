const enrollmentService = require(
  "../services/enrollmentService"
);

async function enrollOrInvite(
  req,
  res,
  next
) {
  try {
    const result =
      await enrollmentService
        .enrollOrInviteUser(
          req.user.id,
          req.params.journeyId,
          req.body
        );

    if (result.invited) {
      return res.status(201).json({
        message:
          "Invitation created successfully",

        invited: true,

        invitation:
          result.invitation,

        /*
         * Solo durante desarrollo.
         * No lo regreses en producción.
         */
        invitationUrl:
          result.invitationUrl,
      });
    }

    return res
      .status(
        result.reactivated ? 200 : 201
      )
      .json({
        message: result.reactivated
          ? "Enrollment reactivated successfully"
          : "User enrolled successfully",

        invited: false,
        reactivated:
          result.reactivated,

        enrollment:
          result.enrollment,

        learner:
          result.user,
      });
  } catch (error) {
    next(error);
  }
}

async function getJourneyEnrollments(
  req,
  res,
  next
) {
  try {
    const result =
      await enrollmentService
        .getJourneyEnrollments(
          req.user.id,
          req.params.journeyId
        );

    res.json({
      enrollments:
        result.enrollments,

      invitations:
        result.invitations,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyEnrollments(
  req,
  res,
  next
) {
  try {
    const enrollments =
      await enrollmentService
        .getMyEnrollments(req.user);

    res.json({
      enrollments,
    });
  } catch (error) {
    next(error);
  }
}

async function changeStatus(
  req,
  res,
  next
) {
  try {
    const enrollment =
      await enrollmentService
        .changeEnrollmentStatus(
          req.user.id,
          req.params.enrollmentId,
          req.body
        );

    res.json({
      message:
        "Enrollment status updated successfully",

      enrollment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  enrollOrInvite,
  getJourneyEnrollments,
  getMyEnrollments,
  changeStatus,
};