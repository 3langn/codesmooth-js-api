import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThanOrEqual, Repository } from "typeorm";
import { LessonEntity } from "../../../entities/lesson.entity";
import { AddLessonDto, SaveLessonDto, UpdateLessonsOrder } from "./lesson.dto";
import { StatusCodesList } from "../../../common/constants/status-codes-list.constants";
import { CustomHttpException } from "../../../common/exception/custom-http.exception";
import { SectionEntity } from "../../../entities/section.entity";
import { CourseEntity } from "../../../entities/course.entity";
import { LessonComponentType } from "../../../common/enum/lesson-component-type";
@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);
  constructor(
    @InjectRepository(LessonEntity)
    private lessonRepository: Repository<LessonEntity>,
    @InjectRepository(SectionEntity)
    private sectionRepository: Repository<LessonEntity>,
    @InjectRepository(CourseEntity)
    private courseRepository: Repository<CourseEntity>,
  ) {}

  async findOneLessonOrFail(lesson_id: number, user_id: number) {
    const lessonExist = await this.lessonRepository.findOne({
      where: { id: lesson_id, owner: { id: user_id } },
      relations: ["section"],
    });
    if (!lessonExist) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Lesson ${lesson_id} not found`,
        code: StatusCodesList.LessonNotFound,
      });
    }
    return lessonExist;
  }

  async saveLesson(data: SaveLessonDto, user_id: number) {
    const lesson = await this.findOneLessonOrFail(data.id, user_id);
    await this.lessonRepository.save(data);

    this.calculateReadingTime(lesson);
  }

  private calculateReadingTime(lesson: LessonEntity) {
    this.lessonRepository
      .findOne({
        where: { course_id: lesson.course_id },
      })
      .then(async (lessons) => {
        // calculate total read time based on the lessons
        let total_read_time = 0;
        lesson.components.forEach((component) => {
          if (component.type === LessonComponentType.Text) {
            total_read_time += Math.ceil(component.content.split(" ").length / 200);
          }
          if (component.type === LessonComponentType.Videl) {
            // total_read_time +=
          }
          if (component.type === LessonComponentType.Code) {
            total_read_time += 10;
          }
        });

        // update course
        await this.courseRepository.update(
          { id: lesson.course_id },
          {
            reading_time: total_read_time || 0,
          },
        );
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  async addLesson(data: AddLessonDto, user_id: number) {
    await this.lessonRepository.increment(
      {
        section: {
          id: data.section_id,
        },
        owner: {
          id: user_id,
        },
        order: MoreThanOrEqual(data.order),
      },
      "order",
      1,
    );
    const section = await this.sectionRepository.findOne({
      where: { id: data.section_id, owner: { id: user_id } },
      relations: ["course", "owner"],
    });
    if (!section) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Section ${data.section_id} not found`,
        code: StatusCodesList.NotFound,
      });
    }
    const d = this.lessonRepository.create({
      components: [],
      title: "New Lesson",
      order: data.order,
      section: {
        id: data.section_id,
      },
      course: {
        id: section.course.id,
      },
      owner: {
        id: section.owner.id,
      },
    });

    const lesson = await this.lessonRepository.save(d);
    return lesson;
  }

  async getLessons(lesson_id: number, user_id: number) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lesson_id, owner_id: user_id },
    });
    if (!lesson) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Lesson ${lesson_id} not found`,
        code: StatusCodesList.LessonNotFound,
      });
    }
    return lesson;
  }

  async swapOrder(lesson1_id: number, lesson2_id: number) {
    const lesson1 = await this.lessonRepository.findOne({
      where: { id: lesson1_id },
    });
    const lesson2 = await this.lessonRepository.findOne({
      where: { id: lesson2_id },
    });

    if (!lesson1 || !lesson2) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Lesson ${lesson1_id} or ${lesson2_id} not found`,
        code: StatusCodesList.LessonNotFound,
      });
    }

    const temp = lesson1.order;
    lesson1.order = lesson2.order;
    lesson2.order = temp;

    await this.lessonRepository.save(lesson1);
    await this.lessonRepository.save(lesson2);
  }

  async deleteLessonById(lesson_id: number, userId: number) {
    const lesson = await this.findOneLessonOrFail(lesson_id, userId);
    await this.lessonRepository.decrement(
      {
        section: {
          id: lesson.section.id,
        },
        owner: {
          id: userId,
        },
        order: MoreThanOrEqual(lesson.order),
      },
      "order",
      1,
    );
    await this.lessonRepository.delete(lesson_id);
  }

  async getLessonsBySectionId(section_id: number, userId: number) {
    const lessons = await this.lessonRepository.find({
      select: ["id", "title", "order", "section_id"],
      where: { section: { id: section_id }, owner: { id: userId } },
      order: { order: "ASC" },
    });
    return lessons;
  }
}
