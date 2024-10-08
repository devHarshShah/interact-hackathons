import { SERVER_ERROR } from '@/config/errors';
import getHandler from '@/handlers/get_handler';
import { HackathonRound, HackathonTeam } from '@/types';
import Toaster from '@/utils/toaster';
import React, { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TeamSearchFilters from '@/components/team_search_filters';
import AdminLiveRoundAnalytics from '@/sections/analytics/admin_live_round_analytics';
import { currentHackathonSelector, markHackathonEnded } from '@/slices/hackathonSlice';
import { useDispatch, useSelector } from 'react-redux';
import { getHackathonRole } from '@/utils/funcs/hackathons';
import { ORG_URL } from '@/config/routes';
import BaseWrapper from '@/wrappers/base';
import moment from 'moment';
import InfiniteScroll from 'react-infinite-scroll-component';
import PictureList from '@/components/common/picture_list';
import { Button } from '@/components/ui/button';
import NewAnnouncement from '@/sections/admin/new_announcement';
import ViewAnnouncements from '@/sections/admin/view_announcements';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import postHandler from '@/handlers/post_handler';
import { UserPlus } from '@phosphor-icons/react';
import { initialHackathonTeam } from '@/types/initials';
import AddTeamMember from '@/sections/admin/add_team_member';

const Index = () => {
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [currentRound, setCurrentRound] = useState<HackathonRound | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState('');
  const [eliminated, setEliminated] = useState('');
  const [overallScore, setOverallScore] = useState(0);
  const [order, setOrder] = useState('latest');
  const [rounds, setRounds] = useState<HackathonRound[]>([]);
  const hackathon = useSelector(currentHackathonSelector);
  const [clickedOnNewAnnouncement, setClickedOnNewAnnouncement] = useState(false);
  const [clickedOnViewAnnouncement, setClickedOnViewAnnouncement] = useState(false);
  const [clickedOnEndHackathon, setClickedOnEndHackathon] = useState(false);
  const [clickedOnAddMember, setClickedOnAddMember] = useState<boolean>(false);
  const [clickedTeam, setClickedTeam] = useState(initialHackathonTeam);

  const getCurrentRound = async () => {
    const URL = `/hackathons/${hackathon.id}/participants/round`;
    const res = await getHandler(URL);
    if (res.statusCode == 200) {
      setCurrentRound(res.data.round);
    } else {
      if (res.data.message) Toaster.error(res.data.message);
      else Toaster.error(SERVER_ERROR);
    }
  };

  const getRounds = async () => {
    const URL = `/org/${hackathon.organizationID}/hackathons/${hackathon.id}/rounds`;
    const res = await getHandler(URL);
    if (res.statusCode == 200) {
      setRounds(res.data.rounds);
    } else {
      if (res.data.message) Toaster.error(res.data.message);
      else Toaster.error(SERVER_ERROR);
    }
  };

  const fetchTeams = async (abortController?: AbortController, initialPage?: number) => {
    const URL = `${ORG_URL}/${hackathon.organizationID}/hackathons/${hackathon.id}/teams?page=${
      initialPage ? initialPage : page
    }&limit=${20}&search=${search}${track != '' && track != 'none' ? `&track_id=${track}` : ''}${
      overallScore != 0 ? `&overall_score=${overallScore}` : ''
    }${eliminated != '' && eliminated != 'none' ? `&is_eliminated=${eliminated == 'eliminated' ? 'true' : 'false'}` : ''}&order=${order}`;

    const res = await getHandler(URL, abortController?.signal);
    if (res.statusCode == 200) {
      if (initialPage == 1) {
        setTeams(res.data.teams || []);
      } else {
        const addedTeams = [...teams, ...(res.data.teams || [])];
        if (addedTeams.length === teams.length) setHasMore(false);
        setTeams(addedTeams);
      }
      setPage(prev => prev + 1);
      setLoading(false);
    } else {
      if (res.data.message) Toaster.error(res.data.message);
      else Toaster.error(SERVER_ERROR);
    }
  };

  let oldAbortController: AbortController | null = null;

  useEffect(() => {
    const abortController = new AbortController();
    if (oldAbortController) oldAbortController.abort();
    oldAbortController = abortController;
    if (!hackathon.id) window.location.replace(`/?redirect_url=${window.location.pathname}`);
    else {
      setPage(1);
      setTeams([]);
      setHasMore(true);
      setLoading(true);
      fetchTeams(abortController, 1);
    }

    return () => {
      abortController.abort();
    };
  }, [search, track, eliminated, overallScore, order]);

  useEffect(() => {
    const role = getHackathonRole();
    if (role != 'admin' && role != 'org') window.location.replace('/?action=sync');
    else if (hackathon.isEnded) window.location.replace('/admin/ended');
    else if (moment().isBefore(hackathon.teamFormationEndTime)) window.location.replace('/admin/teams');
    else {
      getCurrentRound();
      getRounds();
    }
  }, []);

  const role = useMemo(() => getHackathonRole(), []);

  const dispatch = useDispatch();

  const handleEndHackathon = async () => {
    const URL = `/org/${hackathon.organizationID}/hackathons/${hackathon.id}/end`;
    const res = await postHandler(URL, { winners: [] });
    if (res.statusCode == 200) {
      dispatch(markHackathonEnded());
      window.location.assign('/admin/ended');
    } else {
      if (res.data.message) Toaster.error(res.data.message);
      else Toaster.error(SERVER_ERROR);
    }
  };

  return (
    <BaseWrapper>
      {clickedOnNewAnnouncement && <NewAnnouncement setShow={setClickedOnNewAnnouncement} />}
      {clickedOnViewAnnouncement && <ViewAnnouncements setShow={setClickedOnViewAnnouncement} />}
      {clickedOnAddMember && <AddTeamMember setShow={setClickedOnAddMember} team={clickedTeam} />}
      <div className="w-full bg-[#E1F1FF] min-h-base">
        <div className="w-[95%] mx-auto h-full flex flex-col gap-2 md:gap-4 lg:gap-8">
          <div className="--meta-info-container  w-full h-fit flex flex-col gap-4 py-4">
            <div className="w-full flex flex-col md:flex-row items-start md:justify-between gap-6">
              <div className="--heading w-full md:w-1/2 h-full flex flex-col gap-4">
                <section className="w-full h-full text-3xl md:text-4xl lg:text-6xl font-bold lg:leading-[4.5rem]">
                  {currentRound ? (
                    <>
                      <h1
                        style={{
                          background: '-webkit-linear-gradient(0deg, #607ee7,#478EE1)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        Round {currentRound.index + 1} is Live!
                      </h1>
                      <div className="text-3xl"> Ends {moment(currentRound.endTime).fromNow()}.</div>
                      <div className="text-5xl w-3/4">
                        {moment().isBetween(moment(currentRound.judgingStartTime), moment(currentRound.judgingEndTime)) ? (
                          <div className="w-full flex flex-col gap-4">
                            <div className="text-[#003a7c]">Judging is Live!</div>
                            <div className="text-3xl">Ends {moment(currentRound.judgingEndTime).fromNow()}.</div>
                          </div>
                        ) : (
                          moment(currentRound.judgingStartTime).isAfter(moment()) && (
                            <>Next Judging Round Starts {moment(currentRound.judgingStartTime).fromNow()}.</>
                          )
                        )}
                      </div>
                      {/* <div className="w-full flex items-center gap-4 mt-4">
                    <EditDetailsBtn rounds={rounds} />
                  </div> */}
                    </>
                  ) : (
                    <>
                      <h1
                        style={{
                          background: '-webkit-linear-gradient(0deg, #607ee7,#478EE1)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        All Rounds have ended.
                      </h1>
                      {role == 'admin' && (
                        <Dialog open={clickedOnEndHackathon} onOpenChange={setClickedOnEndHackathon}>
                          <DialogTrigger className="w-full text-base font-medium bg-red-500 text-white py-2 rounded-md">End Hackathon</DialogTrigger>
                          <DialogContent>
                            <DialogHeader className="text-left">
                              <DialogTitle>End Hackathon</DialogTitle>
                              <DialogDescription>
                                This action can not be undone. This will mark this hackathon as ended, no further actions would be possible.
                              </DialogDescription>
                            </DialogHeader>
                            <Button onClick={handleEndHackathon} variant={'destructive'}>
                              Confirm
                            </Button>
                          </DialogContent>
                        </Dialog>
                      )}
                    </>
                  )}
                </section>
                <div className="w-full flex gap-4 max-md:flex-col">
                  <Button onClick={() => setClickedOnNewAnnouncement(true)} className="w-1/2 bg-primary_text">
                    <div className="">Create New Announcement</div>
                  </Button>
                  <Button onClick={() => setClickedOnViewAnnouncement(true)} className="w-1/2 bg-primary_text">
                    <div className="">View All Announcements</div>
                  </Button>
                </div>
              </div>
              <AdminLiveRoundAnalytics round={currentRound} />
            </div>
          </div>
          <div className="--team-data-box flex flex-col gap-4">
            <TeamSearchFilters
              search={search}
              setSearch={setSearch}
              track={track}
              setTrack={setTrack}
              eliminated={eliminated}
              setEliminated={setEliminated}
              overallScore={overallScore}
              setOverallScore={setOverallScore}
              order={order}
              setOrder={setOrder}
            />
            <section className="--team-table">
              <InfiniteScroll className="w-full" dataLength={teams.length} next={fetchTeams} hasMore={hasMore} loader={<></>}>
                <Table className="bg-white rounded-md">
                  <TableCaption>A list of all the participating teams</TableCaption>
                  <TableHeader className="uppercase text-xs md:text-sm">
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead className="hidden md:block">Members</TableHead>
                      <TableHead>Elimination Status</TableHead>
                      <TableHead>Round Score</TableHead>
                      {role == 'admin' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="w-full">
                    {teams.map((team, index) => (
                      <TableRow onClick={() => window.location.assign('/admin/live/' + team.id)} key={index} className="cursor-pointer">
                        <TableCell className="font-medium">{team.title}</TableCell>
                        <TableCell>{team.project?.title}</TableCell>
                        <TableCell>{team.track?.title}</TableCell>
                        <TableCell className="min-w-[150px] max-w-[300px] hidden md:flex items-center gap-2 flex-wrap">
                          <PictureList users={team.memberships.map(membership => membership.user)} size={6} />
                        </TableCell>
                        <TableCell>
                          <Status status={team.isEliminated ? 'eliminated' : 'not eliminated'} />
                        </TableCell>
                        <TableCell>{team.roundScore}</TableCell>
                        {role == 'admin' && (
                          <TableCell
                            onClick={el => {
                              el.stopPropagation();
                              setClickedTeam(team);
                              setClickedOnAddMember(true);
                            }}
                          >
                            <UserPlus />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfiniteScroll>
            </section>
          </div>
        </div>
      </div>
    </BaseWrapper>
  );
};

export default Index;

export function Status({ status }: { status: 'eliminated' | 'not eliminated' }) {
  return (
    <button className={`${status === 'eliminated' ? 'bg-red-500' : 'bg-green-500'} text-white text-xs font-medium px-3 py-1 rounded-full`}>
      {status === 'eliminated' ? 'Eliminated' : 'Not Eliminated'}
    </button>
  );
}
